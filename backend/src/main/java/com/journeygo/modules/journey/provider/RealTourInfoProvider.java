package com.journeygo.modules.journey.provider;

import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.experience.entity.Answer;
import com.journeygo.modules.experience.entity.CheckInPoint;
import com.journeygo.modules.experience.entity.Experience;
import com.journeygo.modules.experience.entity.Question;
import com.journeygo.modules.experience.entity.Task;
import com.journeygo.modules.experience.entity.enums.ExperienceStatus;
import com.journeygo.modules.experience.entity.enums.TaskStatus;
import com.journeygo.modules.experience.repository.ExperienceRepository;
import com.journeygo.modules.experience.repository.QuestionRepository;
import com.journeygo.modules.experience.repository.TaskRepository;
import com.journeygo.modules.reward.entity.RewardSettingCode;
import com.journeygo.modules.reward.service.RewardSettingService;
import com.journeygo.modules.tour.entity.StopQuestionKind;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourDestination;
import com.journeygo.modules.tour.entity.TourStop;
import com.journeygo.modules.tour.entity.TourStopAnswer;
import com.journeygo.modules.tour.entity.TourStopExperience;
import com.journeygo.modules.tour.entity.TourStopQuestion;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import com.journeygo.modules.tour.repository.TourRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Nạp nội dung hành trình từ dữ liệu thật: Tour → điểm đến → trải nghiệm đang phát hành →
 * nhiệm vụ đang phát hành → câu hỏi và đáp án.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RealTourInfoProvider implements TourInfoProvider {

    /** Bán kính check-in mặc định tại điểm đến khi điểm đến chưa cấu hình riêng. */
    private static final int DEFAULT_DESTINATION_RADIUS_METERS = 100;

    private final TourRepository tourRepository;
    private final ExperienceRepository experienceRepository;
    private final TaskRepository taskRepository;
    private final QuestionRepository questionRepository;
    private final RewardSettingService rewardSettingService;

    @Override
    @Transactional(readOnly = true)
    public TourInfo getTourInfo(Long tourId) {
        Tour tour = tourRepository.findByTourId(tourId).orElse(null);
        if (tour == null || tour.getStatus() != TourStatus.PUBLISHED) {
            return null;
        }
        if (tour.isWizardTour()) {
            return wizardTourInfo(tour);
        }

        List<TourInfo.TourDestinationInfo> destinations = new ArrayList<>();
        int order = 1;
        for (TourDestination td : tour.getTourDestinations().stream()
                .sorted(Comparator.comparingInt(TourDestination::getSequenceOrder)).toList()) {
            Destination d = td.getDestination();
            // Điểm đến bị thu hồi duyệt (hoặc chưa duyệt) không đưa vào hành trình mới
            if (d == null || d.isDeleted() || !d.isApproved()) continue;

            Experience experience = experienceRepository.findByDestination_Id(d.getId()).stream()
                    .filter(e -> e.getStatus() == ExperienceStatus.PUBLISHED)
                    .min(Comparator.comparing(Experience::getId))
                    .orElse(null);

            List<TourInfo.TourTaskInfo> tasks = experience == null
                    ? List.of()
                    : loadTasks(experience.getId());

            destinations.add(new TourInfo.TourDestinationInfo(
                    d.getId(),
                    d.getName(),
                    order++,
                    experience == null ? null : experience.getId(),
                    d.getLatitude(),
                    d.getLongitude(),
                    DEFAULT_DESTINATION_RADIUS_METERS,
                    d.getQrToken(), // mã QR dán tại cổng: check-in thay GPS
                    tasks
            ));
        }

        return new TourInfo(tour.getTourId(), tour.getTitle(), destinations);
    }

    // ── Tour 5 bước: hành trình dựng từ điểm dừng riêng của tour ────────────────

    /** Bán kính check-in quanh checkpoint đầu tiên của điểm dừng (điểm dừng không có toạ độ riêng). */
    static final int STOP_CHECK_IN_RADIUS_METERS = 300;

    /** Số lần làm lại một hoạt động thực địa (câu hỏi sau trải nghiệm trả lời sai). */
    static final int EXPERIENCE_MAX_ATTEMPTS = 3;

    /**
     * Mỗi điểm dừng là một trạm (check-in GPS quanh checkpoint đầu tiên). Nhiệm vụ của trạm:
     * <ul>
     *   <li>Câu đố (nếu có): id = -id điểm dừng, nộp một lần, đúng câu nào cộng điểm câu đó.</li>
     *   <li>Mỗi hoạt động thực địa: id = id hoạt động, cần tới checkpoint, đếm ngược, quét đúng mã QR rồi mới
     *       trả lời câu hỏi sau trải nghiệm; đúng thì nhận điểm của hoạt động.</li>
     * </ul>
     * Điểm lấy từ giá trị đã chốt lúc duyệt; thiếu thì theo cấu hình Admin hiện hành.
     */
    private TourInfo wizardTourInfo(Tour tour) {
        int defaultQuizPoints = rewardSettingService.pointsFor(RewardSettingCode.QUIZ_QUESTION);
        int defaultExperiencePoints = rewardSettingService.pointsFor(RewardSettingCode.REAL_WORLD_EXPERIENCE);

        List<TourInfo.TourDestinationInfo> stops = new ArrayList<>();
        int order = 1;
        for (TourStop stop : tour.getStops().stream()
                .sorted(Comparator.comparingInt(TourStop::getSequenceOrder)).toList()) {
            List<TourStopExperience> experiences = stop.getExperiences().stream()
                    .sorted(Comparator.comparingInt(TourStopExperience::getSequenceOrder)).toList();
            TourStopExperience located = experiences.stream()
                    .filter(e -> e.getCheckpointLatitude() != null && e.getCheckpointLongitude() != null)
                    .findFirst().orElse(null);

            List<TourInfo.TourTaskInfo> tasks = new ArrayList<>();
            int taskOrder = 1;

            List<TourStopQuestion> quiz = stop.getQuizQuestions().stream()
                    .filter(q -> q.getKind() == StopQuestionKind.QUIZ)
                    .sorted(Comparator.comparingInt(TourStopQuestion::getSequenceOrder)).toList();
            if (!quiz.isEmpty()) {
                List<TourInfo.QuestionInfo> questions = quiz.stream()
                        .map(q -> wizardQuestion(q, null,
                                q.getPointsReward() != null ? q.getPointsReward() : defaultQuizPoints))
                        .toList();
                int total = questions.stream().mapToInt(q -> q.points() == null ? 0 : q.points()).sum();
                tasks.add(new TourInfo.TourTaskInfo(
                        -stop.getId(), "Câu đố tại " + stop.getName(), "QUIZ", taskOrder++, total, 1,
                        "Trả lời các câu hỏi về " + stop.getName() + ". Đúng câu nào được cộng điểm câu đó.",
                        false, questions, null, false, true));
            }

            for (TourStopExperience e : experiences) {
                TourStopQuestion post = e.getQuestion();
                List<TourInfo.QuestionInfo> questions = post == null ? List.of() : List.of(wizardQuestion(post, e, null));
                String name = e.getActivityName() != null && !e.getActivityName().isBlank()
                        ? e.getActivityName() : "Hoạt động thực địa";
                tasks.add(new TourInfo.TourTaskInfo(
                        e.getId(), name, "REAL_WORLD", taskOrder++,
                        e.getPointsReward() != null ? e.getPointsReward() : defaultExperiencePoints,
                        EXPERIENCE_MAX_ATTEMPTS,
                        "Đến điểm hoạt động, thực hiện trong thời gian quy định rồi quét mã QR tại chỗ để trả lời câu hỏi.",
                        true, questions, e.getDurationSeconds(), true, false));
            }

            stops.add(new TourInfo.TourDestinationInfo(
                    stop.getId(),
                    stop.getName(),
                    order++,
                    null,
                    located == null ? null : located.getCheckpointLatitude(),
                    located == null ? null : located.getCheckpointLongitude(),
                    STOP_CHECK_IN_RADIUS_METERS,
                    null,
                    tasks));
        }
        return new TourInfo(tour.getTourId(), tour.getTitle(), stops, true);
    }

    /** Câu hỏi của tour 5 bước; câu sau trải nghiệm mang checkpoint và mã QR của hoạt động làm "trạm". */
    private static TourInfo.QuestionInfo wizardQuestion(TourStopQuestion q, TourStopExperience station, Integer points) {
        List<TourInfo.AnswerInfo> answers = q.getAnswers().stream()
                .sorted(Comparator.comparingInt(TourStopAnswer::getSequenceOrder))
                .map(a -> new TourInfo.AnswerInfo(a.getId(), a.getContent(), a.isCorrect(), a.getSequenceOrder()))
                .toList();
        return new TourInfo.QuestionInfo(
                q.getId(), q.getContent(), q.isTextQuestion() ? "TEXT" : "MULTIPLE_CHOICE", q.getSequenceOrder(),
                q.getReferenceAnswer(),
                station == null ? null : station.getActivityName(),
                station == null ? null : station.getCheckpointLatitude(),
                station == null ? null : station.getCheckpointLongitude(),
                station == null ? null : station.getRadiusMeters(),
                station == null ? null : station.getQrToken(),
                answers, points, true);
    }

    private List<TourInfo.TourTaskInfo> loadTasks(Long experienceId) {
        List<TourInfo.TourTaskInfo> result = new ArrayList<>();
        int order = 1;
        // Chỉ gọi khi trải nghiệm đang phát hành, nên mọi nhiệm vụ chưa xóa (khác INACTIVE) đều thuộc gói đang mở.
        // Không lọc riêng PUBLISHED: dữ liệu cũ có trải nghiệm đã duyệt nhưng nhiệm vụ còn DRAFT
        // khiến hành trình báo 0/0 nhiệm vụ và tự hoàn thành ngay khi check-in.
        for (Task task : taskRepository.findByExperienceIdOrderBySequenceOrderAsc(experienceId).stream()
                .filter(t -> t.getStatus() != TaskStatus.INACTIVE)
                .sorted(Comparator.comparing(Task::getSequenceOrder)).toList()) {
            boolean requiresLocation = task.getTaskType() != null && task.getTaskType().isRequiresLocation();

            List<TourInfo.QuestionInfo> questions = new ArrayList<>();
            for (Question q : questionRepository.findByTaskIdOrderBySequenceOrderAsc(task.getId())) {
                List<TourInfo.AnswerInfo> answers = q.getAnswers().stream()
                        .sorted(Comparator.comparing(Answer::getSequenceOrder))
                        .map(a -> new TourInfo.AnswerInfo(a.getId(), a.getContent(), a.isCorrect(), a.getSequenceOrder()))
                        .toList();
                CheckInPoint station = q.getCheckInPoint();
                questions.add(new TourInfo.QuestionInfo(
                        q.getId(), q.getContent(), q.getQuestionType().name(),
                        q.getSequenceOrder(), q.getExpectedText(),
                        station == null ? null : station.getName(),
                        station == null ? null : station.getLatitude(),
                        station == null ? null : station.getLongitude(),
                        station == null ? null : station.getRadiusMeters(),
                        station == null ? null : station.getQrToken(),
                        answers));
            }

            result.add(new TourInfo.TourTaskInfo(
                    task.getId(),
                    task.getTitle(),
                    task.getTaskType() == null ? "QUIZ" : task.getTaskType().getCode(),
                    order++,
                    task.getPointsReward() == null ? 0 : task.getPointsReward(),
                    task.getMaxAttempts() == null ? 3 : task.getMaxAttempts(),
                    task.getDescription(),
                    requiresLocation,
                    questions
            ));
        }
        return result;
    }
}
