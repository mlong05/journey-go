package com.journeygo.modules.experience.service;

import com.journeygo.modules.experience.dto.request.CreateQuestionRequest;
import com.journeygo.modules.experience.dto.request.SetExpectedTextRequest;
import com.journeygo.modules.experience.dto.response.QuestionResponse;
import com.journeygo.modules.experience.entity.Question;
import com.journeygo.modules.experience.entity.Task;
import com.journeygo.modules.experience.entity.enums.TaskStatus;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.experience.exception.ResourceNotFoundException;
import com.journeygo.modules.experience.repository.QuestionRepository;
import com.journeygo.modules.experience.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Service Question con của Task.
 *
 * BR-TASK-3: QUIZ/FIELD_CLUE phải có ≥1 Question (validate khi Experience submit).
 * BR-TASK-6: MULTIPLE_CHOICE đúng 1 isCorrect=true; TEXT tất cả isCorrect=true.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class QuestionService {

    private final QuestionRepository questionRepository;
    private final TaskRepository taskRepository;

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
        // Chỉ tạo Question khi Task còn DRAFT
        if (task.getStatus() != TaskStatus.DRAFT) {
            throw new BusinessException("BR-Q-CREATE",
                    "Chỉ tạo Question khi Task ở trạng thái DRAFT");
        }

        Question q = Question.builder()
                .task(task)
                .content(req.content())
                .questionType(req.questionType())
                .sequenceOrder(req.sequenceOrder())
                .points(req.points())
                .expectedText(req.expectedText())
                .build();

        Question saved = questionRepository.save(q);
        log.info("Created Question id={} in Task={}", saved.getId(), taskId);
        return QuestionResponse.fromEntity(saved);
    }

    @Transactional
    public QuestionResponse setExpectedText(Long id, SetExpectedTextRequest req) {
        Question q = findOrThrow(id);
        // Chỉ CP/CM chỉnh khi Task còn DRAFT
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
        questionRepository.delete(q);
        log.info("Deleted Question id={}", id);
    }

    // ── internal ────────────────────────────────────────────────────────────

    private Question findOrThrow(Long id) {
        return questionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Question", id));
    }

    private Task findTaskOrThrow(Long id) {
        return taskRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Task", id));
    }
}