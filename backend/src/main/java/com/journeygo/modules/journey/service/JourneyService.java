package com.journeygo.modules.journey.service;

import com.journeygo.modules.experience.entity.enums.CheckInVerificationMethod;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.experience.exception.ResourceNotFoundException;
import com.journeygo.modules.experience.util.GeoUtils;
import com.journeygo.modules.gamification.entity.UserBadge;
import com.journeygo.modules.gamification.entity.enums.PointTransactionType;
import com.journeygo.modules.gamification.service.GamificationService;
import com.journeygo.modules.journey.dto.*;
import com.journeygo.modules.journey.entity.Journey;
import com.journeygo.modules.journey.entity.JourneyDestinationProgress;
import com.journeygo.modules.journey.entity.JourneyTaskProgress;
import com.journeygo.modules.journey.entity.enums.DestinationProgressStatus;
import com.journeygo.modules.journey.entity.enums.JourneyStatus;
import com.journeygo.modules.journey.entity.enums.TaskProgressStatus;
import com.journeygo.modules.journey.provider.TourInfo;
import com.journeygo.modules.journey.provider.TourInfoProvider;
import com.journeygo.modules.journey.repository.JourneyDestinationProgressRepository;
import com.journeygo.modules.journey.repository.JourneyRepository;
import com.journeygo.modules.journey.repository.JourneyTaskProgressRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class JourneyService {

    private final JourneyRepository journeyRepository;
    private final JourneyDestinationProgressRepository destinationProgressRepository;
    private final JourneyTaskProgressRepository taskProgressRepository;
    private final TourInfoProvider tourInfoProvider;
    private final GamificationService gamificationService;

    // ── JOURNEY LIFECYCLE ────────────────────────────────────────────────────────

    @Transactional
    public JourneyResponse startJourney(Long userId, StartJourneyRequest request) {
        var existingActive = journeyRepository.findFirstByUserIdAndTourIdAndStatusInOrderByCreatedAtDesc(
                userId, request.tourId(), List.of(JourneyStatus.NOT_STARTED, JourneyStatus.IN_PROGRESS)
        );

        if (existingActive.isPresent()) {
            log.info("Du khách {} tiếp tục hành trình đang diễn ra (journeyId={})", userId, existingActive.get().getId());
            return JourneyResponse.fromEntity(existingActive.get());
        }

        TourInfo tourInfo = tourInfoProvider.getTourInfo(request.tourId());
        if (tourInfo == null || tourInfo.destinations() == null || tourInfo.destinations().isEmpty()) {
            throw new BusinessException("TOUR-EMPTY", "Tour không có điểm đến khả dụng để khởi hành");
        }

        Journey journey = Journey.builder()
                .userId(userId)
                .bookingId(request.bookingId())
                .tourId(request.tourId())
                .tourName(tourInfo.tourName())
                .status(JourneyStatus.IN_PROGRESS)
                .startedAt(Instant.now())
                .currentDestinationOrder(1)
                .totalDestinations(tourInfo.destinations().size())
                .build();

        for (TourInfo.TourDestinationInfo dInfo : tourInfo.destinations()) {
            JourneyDestinationProgress destProgress = JourneyDestinationProgress.builder()
                    .destinationId(dInfo.destinationId())
                    .destinationName(dInfo.destinationName())
                    .orderIndex(dInfo.orderIndex())
                    .experienceId(dInfo.experienceId())
                    .status(dInfo.orderIndex() == 1 ? DestinationProgressStatus.IN_PROGRESS : DestinationProgressStatus.NOT_STARTED)
                    .totalTasks(dInfo.tasks() != null ? dInfo.tasks().size() : 0)
                    .tasksCompleted(0)
                    .build();

            if (dInfo.tasks() != null) {
                for (TourInfo.TourTaskInfo tInfo : dInfo.tasks()) {
                    JourneyTaskProgress taskProgress = JourneyTaskProgress.builder()
                            .taskId(tInfo.taskId())
                            .taskName(tInfo.taskName())
                            .taskType(tInfo.taskType())
                            .orderIndex(tInfo.orderIndex())
                            .status(TaskProgressStatus.NOT_STARTED)
                            .pointsEarned(0)
                            .attempts(0)
                            .build();

                    destProgress.addTask(taskProgress);
                }
            }

            journey.addDestination(destProgress);
        }

        Journey saved = journeyRepository.save(journey);
        log.info("Du khách {} bắt đầu hành trình mới: journeyId={}, tourId={}", userId, saved.getId(), request.tourId());
        return JourneyResponse.fromEntity(saved);
    }

    @Transactional(readOnly = true)
    public List<JourneyResponse> getMyJourneys(Long userId, JourneyStatus status) {
        List<Journey> list = (status != null)
                ? journeyRepository.findByUserIdAndStatus(userId, status)
                : journeyRepository.findByUserIdOrderByCreatedAtDesc(userId);
        return list.stream().map(JourneyResponse::fromEntity).toList();
    }

    @Transactional(readOnly = true)
    public JourneyResponse getJourneyDetail(Long journeyId, Long userId) {
        Journey journey = findJourneyAndVerifyOwner(journeyId, userId);
        return JourneyResponse.fromEntity(journey);
    }

    // ── CHECK-IN LOGIC ──────────────────────────────────────────────────────────

    @Transactional
    public CheckInResultResponse checkInDestination(Long journeyId, Long destinationId, CheckInJourneyRequest request, Long userId) {
        Journey journey = findJourneyAndVerifyOwner(journeyId, userId);

        if (journey.getStatus() != JourneyStatus.IN_PROGRESS) {
            throw new BusinessException("JOURNEY-NOT-ACTIVE", "Hành trình hiện không ở trạng thái hoạt động");
        }

        JourneyDestinationProgress destProgress = destinationProgressRepository
                .findByJourneyIdAndDestinationId(journeyId, destinationId)
                .orElseThrow(() -> new ResourceNotFoundException("JourneyDestinationProgress", destinationId));

        if (destProgress.isCheckedIn()) {
            log.info("Destination {} trong Journey {} đã check-in trước đó (idempotent)", destinationId, journeyId);
            return CheckInResultResponse.builder()
                    .journeyId(journeyId)
                    .destinationId(destinationId)
                    .success(true)
                    .message("Bạn đã check-in điểm đến này trước đó")
                    .checkedInAt(destProgress.getCheckedInAt())
                    .badgeAwarded(destProgress.isBadgeAwarded())
                    .badgeId(destProgress.getBadgeId())
                    .build();
        }

        TourInfo tourInfo = tourInfoProvider.getTourInfo(journey.getTourId());
        TourInfo.TourDestinationInfo currentDestInfo = tourInfo.destinations().stream()
                .filter(d -> d.destinationId().equals(destinationId))
                .findFirst()
                .orElseThrow(() -> new BusinessException("DEST-NOT-IN-TOUR", "Điểm đến không nằm trong hành trình Tour này"));

        Integer distanceMeters = null;

        if (request.verificationMethod() == CheckInVerificationMethod.GPS) {
            if (request.latitude() == null || request.longitude() == null) {
                throw new BusinessException("GPS-MISSING", "Vui lòng bật định vị GPS để xác thực vị trí");
            }
            if (currentDestInfo.latitude() == null || currentDestInfo.longitude() == null) {
                throw new BusinessException("DEST-COORDINATES-MISSING", "Điểm đến chưa được cấu hình tọa độ GPS");
            }

            BigDecimal dist = GeoUtils.haversineMeters(
                    request.latitude(), request.longitude(),
                    currentDestInfo.latitude(), currentDestInfo.longitude()
            );
            distanceMeters = dist.intValue();

            int allowedRadius = currentDestInfo.radiusMeters() != null ? currentDestInfo.radiusMeters() : 100;
            if (distanceMeters > allowedRadius) {
                throw new BusinessException("GPS-OUT-OF-RANGE",
                        String.format("Bạn đang cách điểm đến %d mét (bán kính cho phép %d mét). Vui lòng đến gần hơn để check-in",
                                distanceMeters, allowedRadius));
            }
        } else if (request.verificationMethod() == CheckInVerificationMethod.QR) {
            if (request.qrValue() == null || request.qrValue().isBlank()) {
                throw new BusinessException("QR-MISSING", "Vui lòng quét mã QR hợp lệ tại điểm đến");
            }
            if (currentDestInfo.qrToken() == null) {
                throw new BusinessException("QR-NOT-CONFIGURED", "Điểm đến này chưa có mã QR, vui lòng check-in bằng GPS");
            }
            if (!request.qrValue().trim().equalsIgnoreCase(currentDestInfo.qrToken())) {
                throw new BusinessException("QR-INVALID", "Mã QR không khớp với điểm đến này");
            }
        }

        destProgress.setCheckedIn(true);
        destProgress.setCheckedInAt(Instant.now());
        destProgress.setStatus(DestinationProgressStatus.IN_PROGRESS);

        UserBadge awardedBadge = gamificationService.awardCheckInBadge(
                userId, destinationId, destProgress.getDestinationName(), journeyId
        );

        destProgress.setBadgeAwarded(true);
        destProgress.setBadgeId(awardedBadge.getBadge().getId());

        destinationProgressRepository.save(destProgress);
        finishDestinationIfDone(journey, destProgress, userId);
        journeyRepository.save(journey);
        log.info("Check-in thành công: user={}, journey={}, dest={}", userId, journeyId, destinationId);

        return CheckInResultResponse.builder()
                .journeyId(journeyId)
                .destinationId(destinationId)
                .success(true)
                .message("Check-in thành công! Bạn đã mở khóa nội dung văn hóa và nhận huy hiệu di sản")
                .distanceMeters(distanceMeters)
                .badgeAwarded(true)
                .badgeId(awardedBadge.getBadge().getId())
                .badgeName(awardedBadge.getBadge().getName())
                .badgeIconUrl(awardedBadge.getBadge().getIconUrl())
                .checkedInAt(destProgress.getCheckedInAt())
                .build();
    }

    // ── NHIỆM VỤ: CÂU HỎI VÀ NỘP BÀI ───────────────────────────────────────────────
    //
    // Điểm thưởng thuộc về NHIỆM VỤ: làm đúng hết câu hỏi thì nhận trọn điểm nhiệm vụ (một lần);
    // chưa đúng hết thì không có điểm và phải làm lại cả nhiệm vụ. maxAttempts đếm theo số lần làm nhiệm vụ.
    //
    // Có hai kiểu nhiệm vụ:
    //  - Thường (QUIZ...): nộp bài của cả nhiệm vụ trong một lần.
    //  - Tương tác ngoài thực tế (requiresLocation): MỖI CÂU HỎI gắn với một địa điểm. Du khách đi lần lượt
    //    từng địa điểm theo thứ tự câu hỏi, check-in (GPS hoặc QR) rồi trả lời câu đó; đúng thì tới địa điểm
    //    kế tiếp; sai một câu thì lần làm đó thất bại và phải làm lại từ câu đầu.

    @Transactional(readOnly = true)
    public PuzzleClueResponse getPuzzleClue(Long journeyId, Long taskId, Long userId) {
        Journey journey = findJourneyAndVerifyOwner(journeyId, userId);
        JourneyTaskProgress taskProgress = findTaskProgress(journeyId, taskId);

        if (!taskProgress.getDestinationProgress().isCheckedIn()) {
            throw new BusinessException("DEST-NOT-CHECKED-IN", "Bạn cần check-in tại điểm đến trước khi nhận gợi ý giải đố");
        }

        TourInfo.TourTaskInfo task = findTaskInfo(journey, taskId);
        TourInfo.QuestionInfo current = task != null ? currentQuestion(task, taskProgress) : null;
        String clue = task != null && task.clue() != null && !task.clue().isBlank()
                ? task.clue()
                : "Hãy quan sát kỹ hiện trường xung quanh địa điểm để tìm câu trả lời";

        return PuzzleClueResponse.builder()
                .taskId(taskId)
                .taskName(taskProgress.getTaskName())
                .taskType(taskProgress.getTaskType())
                .clue(clue)
                .targetLatitude(current != null ? current.stationLatitude() : null)
                .targetLongitude(current != null ? current.stationLongitude() : null)
                .targetRadiusMeters(current != null && current.stationRadiusMeters() != null ? current.stationRadiusMeters() : 50)
                .hint(null)
                .attempts(taskProgress.getAttempts())
                .completed(taskProgress.getStatus() == TaskProgressStatus.COMPLETED)
                .build();
    }

    /**
     * Xem câu hỏi. Nhiệm vụ thường trả mọi câu hỏi. Nhiệm vụ tương tác ngoài thực tế chỉ trả CÂU HIỆN TẠI và
     * chỉ khi du khách đã tới địa điểm của câu đó (latitude/longitude trong bán kính, hoặc qrValue đúng);
     * chưa tới nơi thì trả thông tin địa điểm kế tiếp để dẫn đường.
     */
    @Transactional(readOnly = true)
    public TaskQuestionsResponse getTaskQuestions(Long journeyId, Long taskId, Long userId,
                                                  BigDecimal latitude, BigDecimal longitude, String qrValue) {
        Journey journey = findJourneyAndVerifyOwner(journeyId, userId);
        JourneyTaskProgress taskProgress = findTaskProgress(journeyId, taskId);

        if (!taskProgress.getDestinationProgress().isCheckedIn()) {
            throw new BusinessException("DEST-NOT-CHECKED-IN", "Bạn cần check-in tại điểm đến trước khi xem nhiệm vụ");
        }

        TourInfo.TourTaskInfo task = requireTaskInfo(journey, taskId);
        int max = task.maxAttempts() != null ? task.maxAttempts() : 3;
        int total = task.questions() == null ? 0 : task.questions().size();
        boolean finished = taskProgress.getStatus() == TaskProgressStatus.COMPLETED
                || taskProgress.getStatus() == TaskProgressStatus.FAILED;

        TaskQuestionsResponse.TaskQuestionsResponseBuilder base = TaskQuestionsResponse.builder()
                .taskId(taskId)
                .taskName(task.taskName())
                .taskType(task.taskType())
                .description(task.clue())
                .pointsReward(task.points())
                .maxAttempts(max)
                .attempts(taskProgress.getAttempts())
                .attemptsRemaining(Math.max(0, max - taskProgress.getAttempts()))
                .status(taskProgress.getStatus())
                .requiresLocation(task.requiresLocation())
                .sequential(task.requiresLocation())
                .totalQuestions(total);

        if (!task.requiresLocation()) {
            List<TaskQuestionsResponse.Question> questions = finished ? null : task.questions().stream()
                    .map(this::toTouristQuestion).toList();
            return base.unlocked(!finished).questionIndex(0).questions(questions).build();
        }

        // Nhiệm vụ tương tác ngoài thực tế: từng câu một, theo từng địa điểm
        int index = Math.min(taskProgress.getCurrentQuestionIndex(), Math.max(total - 1, 0));
        base.questionIndex(finished ? total : index);
        if (finished || total == 0) {
            return base.unlocked(!finished).questions(finished ? null : List.of()).build();
        }

        TourInfo.QuestionInfo current = task.questions().get(index);
        LocationCheck location = checkLocation(current, latitude, longitude, qrValue);
        return base
                .unlocked(location.unlocked())
                .distanceMeters(location.distanceMeters())
                .station(toStation(current))
                .questions(location.unlocked() ? List.of(toTouristQuestion(current)) : null)
                .build();
    }

    @Transactional
    public JourneyTaskProgressResponse submitTask(Long journeyId, Long taskId, SubmitTaskRequest request, Long userId) {
        Journey journey = findJourneyAndVerifyOwner(journeyId, userId);

        JourneyTaskProgress taskProgress = findTaskProgress(journeyId, taskId);
        JourneyDestinationProgress destProgress = taskProgress.getDestinationProgress();
        if (!destProgress.isCheckedIn()) {
            throw new BusinessException("DEST-NOT-CHECKED-IN", "Bạn cần check-in tại điểm đến trước khi làm nhiệm vụ");
        }

        if (taskProgress.getStatus() == TaskProgressStatus.COMPLETED) {
            log.info("Task {} đã hoàn thành trước đó (idempotent)", taskId);
            return JourneyTaskProgressResponse.fromEntity(taskProgress);
        }
        if (taskProgress.getStatus() == TaskProgressStatus.FAILED) {
            throw new BusinessException("TASK-ATTEMPTS-EXHAUSTED", "Bạn đã hết số lần làm nhiệm vụ này");
        }

        if (journey.getStatus() != JourneyStatus.IN_PROGRESS) {
            throw new BusinessException("JOURNEY-NOT-ACTIVE", "Hành trình hiện không ở trạng thái hoạt động");
        }

        TourInfo.TourTaskInfo task = requireTaskInfo(journey, taskId);
        int max = task.maxAttempts() != null ? task.maxAttempts() : 3;
        int total = task.questions() == null ? 0 : task.questions().size();

        if (taskProgress.getStartedAt() == null) taskProgress.setStartedAt(Instant.now());
        taskProgress.setStatus(TaskProgressStatus.IN_PROGRESS);
        taskProgress.setUserAnswer(describeSubmission(request));

        int correctCount;
        Boolean lastAnswerCorrect;
        int questionIndex;

        if (task.requiresLocation() && total > 0) {
            // ── Từng câu theo từng địa điểm ──
            int index = taskProgress.getCurrentQuestionIndex();
            if (index >= total) index = 0;
            TourInfo.QuestionInfo current = task.questions().get(index);

            SubmitTaskRequest.QuestionAnswer given = findAnswerFor(request, current.questionId());
            if (given == null) {
                throw new BusinessException("ANSWER-MISSING", "Vui lòng trả lời câu hỏi hiện tại của nhiệm vụ");
            }
            LocationCheck location = checkLocation(current, request.latitude(), request.longitude(), request.qrValue());
            if (!location.unlocked()) {
                throw new BusinessException(location.failureCode(), location.failureMessage());
            }

            if (isAnswerCorrect(current, given)) {
                lastAnswerCorrect = true;
                questionIndex = index + 1;
                correctCount = questionIndex;
                taskProgress.setCurrentQuestionIndex(questionIndex);
                taskProgress.setIsCorrect(null);
                if (questionIndex >= total) {
                    taskProgress.setIsCorrect(true);
                    completeTask(task, taskProgress, destProgress, userId, journeyId);
                }
            } else {
                // Sai một câu: lần làm này thất bại, làm lại cả nhiệm vụ từ câu đầu
                lastAnswerCorrect = false;
                correctCount = index;
                questionIndex = 0;
                taskProgress.setCurrentQuestionIndex(0);
                taskProgress.setIsCorrect(false);
                registerFailedAttempt(taskProgress, max, userId, taskId, journeyId);
            }
        } else {
            // ── Nộp bài cả nhiệm vụ một lần ──
            GradeResult grade = gradeTask(task, request.answers());
            correctCount = grade.correct();
            questionIndex = 0;
            lastAnswerCorrect = grade.passed();
            taskProgress.setIsCorrect(grade.passed());
            if (grade.passed()) {
                completeTask(task, taskProgress, destProgress, userId, journeyId);
            } else {
                registerFailedAttempt(taskProgress, max, userId, taskId, journeyId);
            }
        }

        taskProgressRepository.save(taskProgress);
        destinationProgressRepository.save(destProgress);
        finishDestinationIfDone(journey, destProgress, userId);
        journeyRepository.save(journey);

        return JourneyTaskProgressResponse.fromEntity(taskProgress).toBuilder()
                .maxAttempts(max)
                .attemptsRemaining(Math.max(0, max - taskProgress.getAttempts()))
                .totalQuestions(total)
                .correctCount(correctCount)
                .questionIndex(questionIndex)
                .lastAnswerCorrect(lastAnswerCorrect)
                .build();
    }

    /** Đúng hết: nhận trọn điểm nhiệm vụ, cộng một lần. */
    private void completeTask(TourInfo.TourTaskInfo task, JourneyTaskProgress taskProgress,
                              JourneyDestinationProgress destProgress, Long userId, Long journeyId) {
        int points = task.points() != null ? task.points() : 0;
        taskProgress.setStatus(TaskProgressStatus.COMPLETED);
        taskProgress.setPointsEarned(points);
        taskProgress.setCompletedAt(Instant.now());

        if (points > 0) {
            gamificationService.awardPoints(
                    userId,
                    points,
                    PointTransactionType.EARNED_TASK,
                    "TASK_" + task.taskId() + "_J_" + journeyId,
                    "Hoàn thành nhiệm vụ: " + taskProgress.getTaskName()
            );
        }
        destProgress.setTasksCompleted(destProgress.getTasksCompleted() + 1);
    }

    /** Một lần làm không đạt: không có điểm; hết lượt thì nhiệm vụ thất bại. */
    private void registerFailedAttempt(JourneyTaskProgress taskProgress, int max, Long userId, Long taskId, Long journeyId) {
        taskProgress.setAttempts(taskProgress.getAttempts() + 1);
        taskProgress.setPointsEarned(0);
        if (taskProgress.getAttempts() >= max) {
            taskProgress.setStatus(TaskProgressStatus.FAILED);
            log.info("Du khách {} hết lượt làm nhiệm vụ {} (journey {})", userId, taskId, journeyId);
        }
    }

    /** Điểm đến xong khi mọi nhiệm vụ đã có kết quả (hoàn thành hoặc hết lượt); sau đó mở điểm kế tiếp. */
    private void finishDestinationIfDone(Journey journey, JourneyDestinationProgress destProgress, Long userId) {
        if (!destProgress.isCheckedIn()
                || destProgress.getStatus() == DestinationProgressStatus.COMPLETED
                || destProgress.getStatus() == DestinationProgressStatus.SKIPPED) {
            return;
        }
        boolean allFinished = destProgress.getTasks().stream().allMatch(t ->
                t.getStatus() == TaskProgressStatus.COMPLETED
                        || t.getStatus() == TaskProgressStatus.FAILED
                        || t.getStatus() == TaskProgressStatus.SKIPPED);
        if (!allFinished) return;

        destProgress.setStatus(DestinationProgressStatus.COMPLETED);
        destProgress.setCompletedAt(Instant.now());
        log.info("Hoàn thành toàn bộ nhiệm vụ tại điểm đến {}", destProgress.getDestinationName());

        int nextOrder = destProgress.getOrderIndex() + 1;
        journey.setCurrentDestinationOrder(nextOrder);

        destinationProgressRepository.findByJourneyIdAndOrderIndex(journey.getId(), nextOrder)
                .ifPresent(nextDest -> {
                    nextDest.setStatus(DestinationProgressStatus.IN_PROGRESS);
                    destinationProgressRepository.save(nextDest);
                });
        destinationProgressRepository.save(destProgress);

        long completedDests = journey.getDestinations().stream()
                .filter(d -> d.getStatus() == DestinationProgressStatus.COMPLETED || d.getStatus() == DestinationProgressStatus.SKIPPED)
                .count();

        if (completedDests >= journey.getTotalDestinations()) {
            journey.setStatus(JourneyStatus.COMPLETED);
            journey.setCompletedAt(Instant.now());
            log.info("Chúc mừng! Du khách {} đã hoàn thành toàn bộ hành trình Tour {}", userId, journey.getTourName());

            gamificationService.awardPoints(
                    userId,
                    50,
                    PointTransactionType.EARNED_TOUR,
                    "TOUR_COMPLETION_" + journey.getId(),
                    "Thưởng hoàn thành trọn vẹn hành trình " + journey.getTourName()
            );
        }
    }

    // ── Chấm bài ───────────────────────────────────────────────────────────────

    private record GradeResult(int total, int correct) {
        boolean passed() {
            return correct == total;
        }
    }

    /** Chấm cả nhiệm vụ thường; câu bỏ trống tính là sai. Nhiệm vụ không có câu hỏi thì đạt ngay. */
    private GradeResult gradeTask(TourInfo.TourTaskInfo task, List<SubmitTaskRequest.QuestionAnswer> submitted) {
        List<TourInfo.QuestionInfo> questions = task.questions() == null ? List.of() : task.questions();
        Map<Long, SubmitTaskRequest.QuestionAnswer> byQuestion = new HashMap<>();
        if (submitted != null) {
            for (SubmitTaskRequest.QuestionAnswer a : submitted) {
                if (a != null && a.questionId() != null) byQuestion.put(a.questionId(), a);
            }
        }
        int correct = 0;
        for (TourInfo.QuestionInfo q : questions) {
            if (isAnswerCorrect(q, byQuestion.get(q.questionId()))) correct++;
        }
        return new GradeResult(questions.size(), correct);
    }

    private boolean isAnswerCorrect(TourInfo.QuestionInfo q, SubmitTaskRequest.QuestionAnswer given) {
        if (given == null) return false;
        if ("TEXT".equals(q.questionType())) {
            String actual = normalizeText(given.text());
            if (actual.isEmpty()) return false;
            String expected = normalizeText(q.expectedText());
            return expected.isEmpty() || expected.equalsIgnoreCase(actual);
        }
        return given.answerId() != null
                && q.answers().stream().anyMatch(x -> x.correct() && x.answerId().equals(given.answerId()));
    }

    private SubmitTaskRequest.QuestionAnswer findAnswerFor(SubmitTaskRequest request, Long questionId) {
        if (request.answers() == null) return null;
        return request.answers().stream()
                .filter(a -> a != null && questionId.equals(a.questionId()))
                .findFirst()
                .orElse(null);
    }

    private String normalizeText(String value) {
        return value == null ? "" : value.trim().replaceAll("\\s+", " ");
    }

    private String describeSubmission(SubmitTaskRequest request) {
        if (request.answers() == null || request.answers().isEmpty()) return null;
        StringBuilder sb = new StringBuilder();
        for (SubmitTaskRequest.QuestionAnswer a : request.answers()) {
            if (a == null) continue;
            if (sb.length() > 0) sb.append(" | ");
            sb.append(a.questionId()).append(':');
            sb.append(a.answerId() != null ? "answer=" + a.answerId() : "text=" + normalizeText(a.text()));
        }
        return sb.toString();
    }

    // ── Kiểm tra vị trí (câu hỏi gắn với địa điểm) ─────────────────────────────

    private record LocationCheck(boolean unlocked, Integer distanceMeters, String failureCode, String failureMessage) {
        static LocationCheck ok(Integer distance) {
            return new LocationCheck(true, distance, null, null);
        }

        static LocationCheck fail(Integer distance, String code, String message) {
            return new LocationCheck(false, distance, code, message);
        }
    }

    /** Mở khóa bằng một trong hai cách: quét đúng mã QR của địa điểm, hoặc đứng trong bán kính của địa điểm. */
    private LocationCheck checkLocation(TourInfo.QuestionInfo q, BigDecimal latitude, BigDecimal longitude, String qrValue) {
        boolean hasCoords = q.stationLatitude() != null && q.stationLongitude() != null;
        boolean hasQr = q.stationQrToken() != null && !q.stationQrToken().isBlank();
        if (!hasCoords && !hasQr) return LocationCheck.ok(null); // câu hỏi chưa gắn địa điểm: không có gì để kiểm tra

        if (qrValue != null && !qrValue.isBlank()) {
            if (hasQr && qrValue.trim().equalsIgnoreCase(q.stationQrToken().trim())) {
                return LocationCheck.ok(null);
            }
            return LocationCheck.fail(null, "QR-INVALID", "Mã QR không khớp với địa điểm của câu hỏi này");
        }

        if (latitude == null || longitude == null || !hasCoords) {
            return LocationCheck.fail(null, "GPS-REQUIRED",
                    "Hãy đến đúng địa điểm của câu hỏi (bật định vị GPS) hoặc quét mã QR tại đó để mở câu hỏi");
        }

        int distance = GeoUtils.haversineMeters(latitude, longitude, q.stationLatitude(), q.stationLongitude()).intValue();
        int allowed = q.stationRadiusMeters() != null ? q.stationRadiusMeters() : 50;
        if (distance > allowed) {
            return LocationCheck.fail(distance, "GPS-OUT-OF-PUZZLE-ZONE",
                    String.format("Bạn đang cách địa điểm của câu hỏi %d mét (yêu cầu trong phạm vi %d mét). Hãy đến gần hơn hoặc quét mã QR tại đó", distance, allowed));
        }
        return LocationCheck.ok(distance);
    }

    // ── Chuyển đổi dữ liệu trả về (không bao giờ kèm đáp án đúng hay mã QR) ─────

    private TaskQuestionsResponse.Question toTouristQuestion(TourInfo.QuestionInfo q) {
        return new TaskQuestionsResponse.Question(
                q.questionId(), q.content(), q.questionType(), q.orderIndex(),
                "TEXT".equals(q.questionType())
                        ? List.of()
                        : q.answers().stream()
                                .map(x -> new TaskQuestionsResponse.Option(x.answerId(), x.content(), x.orderIndex()))
                                .toList());
    }

    private TaskQuestionsResponse.Station toStation(TourInfo.QuestionInfo q) {
        if (q.stationLatitude() == null && q.stationLongitude() == null && q.stationName() == null) return null;
        return new TaskQuestionsResponse.Station(q.stationName(), q.stationLatitude(), q.stationLongitude(), q.stationRadiusMeters());
    }

    // ── Tra cứu ────────────────────────────────────────────────────────────────

    private TourInfo.QuestionInfo currentQuestion(TourInfo.TourTaskInfo task, JourneyTaskProgress progress) {
        if (task.questions() == null || task.questions().isEmpty()) return null;
        int index = Math.min(progress.getCurrentQuestionIndex(), task.questions().size() - 1);
        return task.questions().get(index);
    }

    private JourneyTaskProgress findTaskProgress(Long journeyId, Long taskId) {
        return taskProgressRepository.findByJourneyId(journeyId)
                .stream()
                .filter(t -> t.getTaskId().equals(taskId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Task in Journey", taskId));
    }

    private TourInfo.TourTaskInfo findTaskInfo(Journey journey, Long taskId) {
        TourInfo tourInfo = tourInfoProvider.getTourInfo(journey.getTourId());
        if (tourInfo == null) return null;
        return tourInfo.destinations().stream()
                .flatMap(d -> d.tasks().stream())
                .filter(t -> t.taskId().equals(taskId))
                .findFirst()
                .orElse(null);
    }

    private TourInfo.TourTaskInfo requireTaskInfo(Journey journey, Long taskId) {
        TourInfo.TourTaskInfo task = findTaskInfo(journey, taskId);
        if (task == null) {
            throw new BusinessException("TASK-NOT-AVAILABLE", "Nhiệm vụ này không còn khả dụng trong tour");
        }
        return task;
    }

    @Transactional
    public JourneyDestinationProgressResponse skipDestination(Long journeyId, Long destinationId, Long userId) {
        Journey journey = findJourneyAndVerifyOwner(journeyId, userId);

        JourneyDestinationProgress destProgress = destinationProgressRepository
                .findByJourneyIdAndDestinationId(journeyId, destinationId)
                .orElseThrow(() -> new ResourceNotFoundException("JourneyDestinationProgress", destinationId));

        destProgress.setStatus(DestinationProgressStatus.SKIPPED);
        destProgress.setCompletedAt(Instant.now());

        int nextOrder = destProgress.getOrderIndex() + 1;
        journey.setCurrentDestinationOrder(nextOrder);

        destinationProgressRepository.findByJourneyIdAndOrderIndex(journeyId, nextOrder)
                .ifPresent(nextDest -> {
                    nextDest.setStatus(DestinationProgressStatus.IN_PROGRESS);
                    destinationProgressRepository.save(nextDest);
                });

        long completedDests = journey.getDestinations().stream()
                .filter(d -> d.getStatus() == DestinationProgressStatus.COMPLETED || d.getStatus() == DestinationProgressStatus.SKIPPED)
                .count();

        if (completedDests >= journey.getTotalDestinations()) {
            journey.setStatus(JourneyStatus.COMPLETED);
            journey.setCompletedAt(Instant.now());
        }

        destinationProgressRepository.save(destProgress);
        journeyRepository.save(journey);

        log.info("Du khách {} đã bỏ qua điểm đến {}", userId, destProgress.getDestinationName());
        return JourneyDestinationProgressResponse.fromEntity(destProgress);
    }

    private Journey findJourneyAndVerifyOwner(Long journeyId, Long userId) {
        Journey journey = journeyRepository.findByIdWithDestinations(journeyId)
                .orElseThrow(() -> new ResourceNotFoundException("Journey", journeyId));

        if (!journey.getUserId().equals(userId)) {
            throw new BusinessException("FORBIDDEN-JOURNEY", "Bạn không có quyền truy cập vào hành trình của người khác");
        }
        return journey;
    }
}
