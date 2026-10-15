package com.journeygo.modules.experience.service;

import com.journeygo.modules.experience.dto.request.CreateAnswerRequest;
import com.journeygo.modules.experience.dto.request.UpdateAnswerRequest;
import com.journeygo.modules.experience.dto.response.AnswerResponse;
import com.journeygo.modules.experience.entity.Answer;
import com.journeygo.modules.experience.entity.Question;
import com.journeygo.modules.experience.entity.enums.QuestionType;
import com.journeygo.modules.experience.entity.enums.TaskStatus;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.experience.exception.ResourceNotFoundException;
import com.journeygo.modules.experience.repository.AnswerRepository;
import com.journeygo.modules.experience.repository.QuestionRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * Service Answer con của Question.
 *
 * BR-TASK-6:
 *   - MULTIPLE_CHOICE: đúng 1 isCorrect=true trong các answer của question.
 *   - TEXT: tất cả answer isCorrect=true (mỗi answer là 1 cách viết được chấp nhận).
 * BR-TASK-5: KHÔNG BAO GIỜ gửi isCorrect xuống Tourist — dùng AnswerResponse.forTourist().
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnswerService {

    private final AnswerRepository answerRepository;
    private final QuestionRepository questionRepository;

    @Transactional(readOnly = true)
    public AnswerResponse getById(Long id, boolean forTourist) {
        Answer a = findOrThrow(id);
        return forTourist ? AnswerResponse.forTourist(a) : AnswerResponse.fromEntity(a);
    }

    @Transactional
    public AnswerResponse create(Long questionId, CreateAnswerRequest req) {
        Question q = findQuestionOrThrow(questionId);
        if (q.getTask().getStatus() != TaskStatus.DRAFT) {
            throw new BusinessException("BR-A-CREATE",
                    "Chỉ tạo Answer khi Task ở trạng thái DRAFT");
        }

        validateAnswerCorrectness(q, null, Boolean.TRUE.equals(req.isCorrect()));

        Answer a = Answer.builder()
                .question(q)
                .content(req.content())
                .isCorrect(Boolean.TRUE.equals(req.isCorrect()))
                .sequenceOrder(req.sequenceOrder())
                .explanation(req.explanation())
                .build();

        Answer saved = answerRepository.save(a);
        log.info("Created Answer id={} in Question={} isCorrect={}",
                saved.getId(), questionId, saved.isCorrect());
        return AnswerResponse.fromEntity(saved);
    }

    @Transactional
    public AnswerResponse update(Long id, UpdateAnswerRequest req) {
        Answer a = findOrThrow(id);
        if (a.getQuestion().getTask().getStatus() != TaskStatus.DRAFT) {
            throw new BusinessException("BR-A-EDIT",
                    "Chỉ sửa Answer khi Task ở trạng thái DRAFT");
        }

        boolean newIsCorrect = req.isCorrect() != null ? req.isCorrect() : a.isCorrect();
        // Validate lại khi isCorrect thay đổi
        if (req.isCorrect() != null && req.isCorrect() != a.isCorrect()) {
            validateAnswerCorrectness(a.getQuestion(), a.getId(), newIsCorrect);
        }

        if (req.content() != null) a.setContent(req.content());
        if (req.isCorrect() != null) a.setCorrect(req.isCorrect());
        if (req.sequenceOrder() != null) a.setSequenceOrder(req.sequenceOrder());
        if (req.explanation() != null) a.setExplanation(req.explanation());

        Answer saved = answerRepository.save(a);
        return AnswerResponse.fromEntity(saved);
    }

    @Transactional
    public void delete(Long id) {
        Answer a = findOrThrow(id);
        if (a.getQuestion().getTask().getStatus() != TaskStatus.DRAFT) {
            throw new BusinessException("BR-A-DELETE",
                    "Chỉ xóa Answer khi Task ở trạng thái DRAFT");
        }
        answerRepository.delete(a);
        log.info("Deleted Answer id={}", id);
    }

    /**
     * BR-TASK-6: validate số lượng isCorrect=true theo questionType.
     *
     * - MULTIPLE_CHOICE: đúng 1 isCorrect=true (loại trừ answer hiện tại nếu update).
     * - TEXT: tất cả isCorrect=true (không giới hạn số lượng).
     */
    private void validateAnswerCorrectness(Question q, Long excludeAnswerId, boolean newIsCorrect) {
        if (!newIsCorrect) return;     // thêm/sửa thành false → không cần check

        if (q.getQuestionType() == QuestionType.MULTIPLE_CHOICE) {
            boolean alreadyHasCorrect = (excludeAnswerId == null)
                    ? answerRepository.existsByQuestionIdAndIsCorrectTrue(q.getId())
                    : answerRepository.findByQuestionIdOrderBySequenceOrderAsc(q.getId()).stream()
                        .anyMatch(a -> !a.getId().equals(excludeAnswerId) && a.isCorrect());
            if (alreadyHasCorrect) {
                throw new BusinessException("BR-TASK-6",
                        "MULTIPLE_CHOICE chỉ cho phép đúng 1 đáp án isCorrect=true");
            }
        }
        // QuestionType.TEXT không giới hạn số isCorrect=true → không cần check
    }

    // ── internal ────────────────────────────────────────────────────────────

    private Answer findOrThrow(Long id) {
        return answerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Answer", id));
    }

    private Question findQuestionOrThrow(Long id) {
        return questionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Question", id));
    }
}