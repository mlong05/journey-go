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
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourDestination;
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

    @Override
    @Transactional(readOnly = true)
    public TourInfo getTourInfo(Long tourId) {
        Tour tour = tourRepository.findByTourId(tourId).orElse(null);
        if (tour == null || tour.getStatus() != TourStatus.PUBLISHED) {
            return null;
        }

        List<TourInfo.TourDestinationInfo> destinations = new ArrayList<>();
        int order = 1;
        for (TourDestination td : tour.getTourDestinations().stream()
                .sorted(Comparator.comparingInt(TourDestination::getSequenceOrder)).toList()) {
            Destination d = td.getDestination();
            if (d == null || d.isDeleted()) continue;

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

    private List<TourInfo.TourTaskInfo> loadTasks(Long experienceId) {
        List<TourInfo.TourTaskInfo> result = new ArrayList<>();
        int order = 1;
        for (Task task : taskRepository.findByExperienceIdAndStatus(experienceId, TaskStatus.PUBLISHED).stream()
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
