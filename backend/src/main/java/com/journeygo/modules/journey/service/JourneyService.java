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
import java.util.List;

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

    // ── TASK SUBMISSION (QUIZ & GPS PUZZLE) ──────────────────────────────────────

    @Transactional(readOnly = true)
    public PuzzleClueResponse getPuzzleClue(Long journeyId, Long taskId, Long userId) {
        Journey journey = findJourneyAndVerifyOwner(journeyId, userId);

        JourneyTaskProgress taskProgress = taskProgressRepository.findByJourneyId(journeyId)
                .stream()
                .filter(t -> t.getTaskId().equals(taskId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Task in Journey", taskId));

        JourneyDestinationProgress destProgress = taskProgress.getDestinationProgress();
        if (!destProgress.isCheckedIn()) {
            throw new BusinessException("DEST-NOT-CHECKED-IN", "Bạn cần check-in tại điểm đến trước khi nhận gợi ý giải đố");
        }

        TourInfo tourInfo = tourInfoProvider.getTourInfo(journey.getTourId());
        TourInfo.TourTaskInfo matchedTaskInfo = tourInfo.destinations().stream()
                .flatMap(d -> d.tasks().stream())
                .filter(t -> t.taskId().equals(taskId))
                .findFirst()
                .orElse(null);

        String clue = matchedTaskInfo != null && matchedTaskInfo.clue() != null
                ? matchedTaskInfo.clue()
                : "Hãy quan sát kỹ hiện trường xung quanh địa điểm để tìm câu trả lời";
        String hint = matchedTaskInfo != null ? matchedTaskInfo.hint() : null;
        BigDecimal targetLat = matchedTaskInfo != null ? matchedTaskInfo.targetLatitude() : null;
        BigDecimal targetLng = matchedTaskInfo != null ? matchedTaskInfo.targetLongitude() : null;
        Integer targetRadius = matchedTaskInfo != null && matchedTaskInfo.targetRadiusMeters() != null
                ? matchedTaskInfo.targetRadiusMeters() : 50;

        return PuzzleClueResponse.builder()
                .taskId(taskId)
                .taskName(taskProgress.getTaskName())
                .taskType(taskProgress.getTaskType())
                .clue(clue)
                .targetLatitude(targetLat)
                .targetLongitude(targetLng)
                .targetRadiusMeters(targetRadius)
                .hint(hint)
                .attempts(taskProgress.getAttempts())
                .completed(taskProgress.getStatus() == TaskProgressStatus.COMPLETED)
                .build();
    }

    @Transactional
    public JourneyTaskProgressResponse submitTask(Long journeyId, Long taskId, SubmitTaskRequest request, Long userId) {
        Journey journey = findJourneyAndVerifyOwner(journeyId, userId);

        JourneyTaskProgress taskProgress = taskProgressRepository.findByJourneyId(journeyId)
                .stream()
                .filter(t -> t.getTaskId().equals(taskId))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Task in Journey", taskId));

        JourneyDestinationProgress destProgress = taskProgress.getDestinationProgress();
        if (!destProgress.isCheckedIn()) {
            throw new BusinessException("DEST-NOT-CHECKED-IN", "Bạn cần check-in tại điểm đến trước khi làm nhiệm vụ");
        }

        if (taskProgress.getStatus() == TaskProgressStatus.COMPLETED) {
            log.info("Task {} đã hoàn thành trước đó (idempotent)", taskId);
            return JourneyTaskProgressResponse.fromEntity(taskProgress);
        }

        taskProgress.setAttempts(taskProgress.getAttempts() + 1);
        taskProgress.setUserAnswer(request.answer());

        TourInfo tourInfo = tourInfoProvider.getTourInfo(journey.getTourId());
        TourInfo.TourTaskInfo matchedTaskInfo = tourInfo.destinations().stream()
                .flatMap(d -> d.tasks().stream())
                .filter(t -> t.taskId().equals(taskId))
                .findFirst()
                .orElse(null);

        // ── GPS PUZZLE LOCATION VERIFICATION ─────────────────────────────────────────
        if (matchedTaskInfo != null && "REAL_WORLD_INTERACTIVE".equalsIgnoreCase(matchedTaskInfo.taskType())) {
            if (matchedTaskInfo.targetLatitude() != null && matchedTaskInfo.targetLongitude() != null) {
                if (request.latitude() == null || request.longitude() == null) {
                    throw new BusinessException("GPS-REQUIRED", "Nhiệm vụ tương tác thực tế yêu cầu bật định vị GPS tại hiện trường");
                }

                BigDecimal dist = GeoUtils.haversineMeters(
                        request.latitude(), request.longitude(),
                        matchedTaskInfo.targetLatitude(), matchedTaskInfo.targetLongitude()
                );
                int allowedRadius = matchedTaskInfo.targetRadiusMeters() != null ? matchedTaskInfo.targetRadiusMeters() : 60;

                if (dist.intValue() > allowedRadius) {
                    throw new BusinessException("GPS-OUT-OF-PUZZLE-ZONE",
                            String.format("Bạn đang cách điểm giải đố %d mét (yêu cầu trong phạm vi %d mét). Hãy đến gần vị trí hơn để giải mật mã!",
                                    dist.intValue(), allowedRadius));
                }
            }
        }

        boolean isCorrect = false;
        int pointsToAward = 10;

        if (matchedTaskInfo != null) {
            pointsToAward = matchedTaskInfo.points() != null ? matchedTaskInfo.points() : 10;
            String expected = matchedTaskInfo.correctAnswer();
            if (expected != null && request.answer() != null) {
                // Chuẩn hóa chuỗi so sánh: bỏ khoảng trắng thừa, không phân biệt hoa thường
                String normalizedActual = request.answer().trim().replaceAll("\\s+", " ");
                String normalizedExpected = expected.trim().replaceAll("\\s+", " ");
                isCorrect = normalizedExpected.equalsIgnoreCase(normalizedActual);
            } else {
                isCorrect = true;
            }
        } else {
            isCorrect = true;
        }

        taskProgress.setIsCorrect(isCorrect);

        if (isCorrect) {
            taskProgress.setStatus(TaskProgressStatus.COMPLETED);
            taskProgress.setPointsEarned(pointsToAward);
            taskProgress.setCompletedAt(Instant.now());

            gamificationService.awardPoints(
                    userId,
                    pointsToAward,
                    PointTransactionType.EARNED_TASK,
                    "TASK_" + taskId + "_J_" + journeyId,
                    "Hoàn thành xuất sắc nhiệm vụ: " + taskProgress.getTaskName()
            );

            destProgress.setTasksCompleted(destProgress.getTasksCompleted() + 1);

            if (destProgress.getTasksCompleted() >= destProgress.getTotalTasks()) {
                destProgress.setStatus(DestinationProgressStatus.COMPLETED);
                destProgress.setCompletedAt(Instant.now());
                log.info("Hoàn thành toàn bộ nhiệm vụ tại điểm đến {}", destProgress.getDestinationName());

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
                    log.info("Chúc mừng! Du khách {} đã hoàn thành toàn bộ hành trình Tour {}", userId, journey.getTourName());

                    gamificationService.awardPoints(
                            userId,
                            50,
                            PointTransactionType.EARNED_TOUR,
                            "TOUR_COMPLETION_" + journeyId,
                            "Thưởng hoàn thành trọn vẹn hành trình " + journey.getTourName()
                    );
                }
            }
        }

        taskProgressRepository.save(taskProgress);
        destinationProgressRepository.save(destProgress);
        journeyRepository.save(journey);

        return JourneyTaskProgressResponse.fromEntity(taskProgress);
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
