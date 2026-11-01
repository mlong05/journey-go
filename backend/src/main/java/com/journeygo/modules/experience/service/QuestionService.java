package com.journeygo.modules.experience.service;

import com.journeygo.modules.experience.dto.request.CreateQuestionRequest;
import com.journeygo.modules.experience.dto.request.SetExpectedTextRequest;
import com.journeygo.modules.experience.dto.response.QuestionResponse;
import com.journeygo.modules.experience.entity.CheckInPoint;
import com.journeygo.modules.experience.entity.Question;
import com.journeygo.modules.experience.entity.Task;
import com.journeygo.modules.experience.entity.enums.TaskStatus;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.experience.exception.ResourceNotFoundException;
import com.journeygo.modules.experience.repository.CheckInPointRepository;
import com.journeygo.modules.experience.repository.QuestionRepository;
import com.journeygo.modules.experience.repository.UnlockConditionRepository;
import com.journeygo.modules.experience.repository.UserCheckInPointRepository;
import com.journeygo.modules.experience.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final TaskRepository taskRepository;
    private final CheckInPointRepository checkInPointRepository;
    private final UnlockConditionRepository unlockConditionRepository;
    private final UserCheckInPointRepository userCheckInPointRepository;

    @Transactional(readOnly = true)
    public QuestionResponse getById(Long id, boolean forTourist) {
        Question q = findOrThrow(id);
        return forTourist ? QuestionResponse.forTourist(q) : QuestionResponse.fromEntity(q);
    }

    @Transactional(readOnly = true)
    public List<QuestionResponse> listByTask(Long taskId, boolean forTourist) {
        List<Question> qs = questionRepository.findByTaskIdOrderBySequenceOrderAsc(taskId);
        return qs.stream()
                .map(forTourist ? QuestionResponse::forTourist : QuestionResponse::fromEntity)
                .toList();
    }

    @Transactional
    public QuestionResponse create(Long taskId, CreateQuestionRequest req) {
        Task task = findTaskOrThrow(taskId);

        if (task.getStatus() != TaskStatus.DRAFT) {
            throw new BusinessException("BR-Q-CREATE",
                    "Chỉ tạo Question khi Task ở trạng thái DRAFT");
        }

        // Nhiệm vụ tương tác ngoài thực tế: mỗi câu hỏi gắn với một địa điểm check-in riêng
        CheckInPoint station = null;
        boolean requiresLocation = task.getTaskType() != null && task.getTaskType().isRequiresLocation();
        if (requiresLocation) {
            if (req.checkInPointId() == null) {
                throw new BusinessException("BR-Q-LOCATION",
                        "Câu hỏi của nhiệm vụ tương tác ngoài thực tế phải gắn với một địa điểm check-in");
            }
            station = checkInPointRepository.findById(req.checkInPointId())
                    .orElseThrow(() -> new ResourceNotFoundException("CheckInPoint", req.checkInPointId()));
            if (!station.getExperience().getId().equals(task.getExperience().getId())) {
                throw new BusinessException("BR-Q-LOCATION",
                        "Địa điểm check-in phải thuộc cùng trải nghiệm với nhiệm vụ");
            }
        }

        Question q = Question.builder()
                .task(task)
                .checkInPoint(station)
                .content(req.content())
                .imageUrl(blankToNull(req.imageUrl()))
                .questionType(req.questionType())
                .sequenceOrder(req.sequenceOrder())
                .expectedText(req.expectedText())
                .build();

        Question saved = questionRepository.save(q);
        log.info("Created Question id={} in Task={}", saved.getId(), taskId);
        return QuestionResponse.fromEntity(saved);
    }

    @Transactional
    public QuestionResponse setExpectedText(Long id, SetExpectedTextRequest req) {
        Question q = findOrThrow(id);

        if (q.getTask().getStatus() != TaskStatus.DRAFT) {
            throw new BusinessException("BR-Q-EDIT",
                    "Chỉ chỉnh expectedText khi Task ở trạng thái DRAFT");
        }
        q.setExpectedText(req.expectedText());
        Question saved = questionRepository.save(q);
        return QuestionResponse.fromEntity(saved);
    }

    @Transactional
    public void delete(Long id) {
        Question q = findOrThrow(id);
        if (q.getTask().getStatus() != TaskStatus.DRAFT) {
            throw new BusinessException("BR-Q-DELETE",
                    "Chỉ xóa Question khi Task ở trạng thái DRAFT");
        }
        CheckInPoint station = q.getCheckInPoint();
        questionRepository.delete(q);
        questionRepository.flush();
        log.info("Deleted Question id={}", id);

        // Địa điểm thuộc riêng câu hỏi: xoá theo nếu không còn nơi nào dùng tới
        if (station != null) {
            Long stationId = station.getId();
            boolean inUse = questionRepository.existsByCheckInPointIdAndIdNot(stationId, id)
                    || taskRepository.existsByCheckInPointIdAndIdNot(stationId, -1L)
                    || unlockConditionRepository.existsByCheckInPointId(stationId)
                    || userCheckInPointRepository.existsByCheckInPointId(stationId);
            if (!inUse) {
                checkInPointRepository.delete(station);
                log.info("Deleted CheckInPoint id={} cùng Question id={}", stationId, id);
            }
        }
    }

    private static String blankToNull(String s) {
        return s == null || s.isBlank() ? null : s.trim();
    }

    private Question findOrThrow(Long id) {
        return questionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Question", id));
    }

    private Task findTaskOrThrow(Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task", id));
    }
}
