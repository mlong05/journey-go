package com.journeygo.modules.experience.security;

import com.journeygo.modules.experience.entity.*;
import com.journeygo.modules.experience.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

/**
 * Helper kiểm tra ownership cho các resource thuộc module experience.
 *
 * <h3>Quy tắc</h3>
 * <ul>
 *   <li>{@code ADMIN} → bypass mọi ownership check.</li>
 *   <li>Provider (chủ {@code Experience.createdBy}) → được CRUD các resource con.</li>
 *   <li>User khác → 403 FORBIDDEN.</li>
 * </ul>
 *
 * <p>Mọi method đều resolve ngược về {@code Experience.createdBy.id} để so sánh.</p>
 *
 * <h3>Cách dùng với {@code @PreAuthorize}</h3>
 * <pre>{@code
 *   // Role gate + ownership gate trên cùng 1 annotation:
 *   @PreAuthorize("hasAnyRole('PROVIDER','ADMIN') and @experienceSecurityBean.isOwnerOfExperience(#id)")
 *   public ExperienceResponse update(...) { ... }
 * }</pre>
 *
 * <p>Tất cả ownership check chạy qua {@code @PreAuthorize(... isOwnerOfXxx(...))} ở controller.
 * Trong service (nếu cần guard thủ công), gọi thẳng {@code isOwnerOfXxx(...)} và xử lý boolean
 * (nên dùng {@code BusinessException} hoặc để {@code GlobalExceptionHandler} lo lỗi 403).</p>
 */
@Component("experienceSecurityBean")
@RequiredArgsConstructor
public class ExperienceSecurity {

    private final ExperienceRepository experienceRepository;
    private final TaskRepository taskRepository;
    private final CheckInPointRepository checkInPointRepository;
    private final QuestionRepository questionRepository;
    private final AnswerRepository answerRepository;
    private final ExperienceSlotRepository slotRepository;

    // ── SpEL-friendly boolean methods (dùng với @PreAuthorize) ──────────────

    /** Trả true nếu user hiện tại là ADMIN hoặc là owner của Experience {@code id}. */
    @Transactional(readOnly = true)
    public boolean isOwnerOfExperience(Long id) {
        if (isAdmin()) return true;
        // findByIdWithOwner chỉ fetch Experience + createdBy → tránh MultipleBagFetchException.
        return experienceRepository.findByIdWithOwner(id)
                .map(this::isCreatedByCurrentUser)
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public boolean isOwnerOfTask(Long id) {
        if (isAdmin()) return true;
        return taskRepository.findByIdWithOwner(id)
                .map(Task::getExperience)
                .map(this::isCreatedByCurrentUser)
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public boolean isOwnerOfCheckInPoint(Long id) {
        if (isAdmin()) return true;
        return checkInPointRepository.findByIdWithOwner(id)
                .map(CheckInPoint::getExperience)
                .map(this::isCreatedByCurrentUser)
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public boolean isOwnerOfQuestion(Long id) {
        if (isAdmin()) return true;
        return questionRepository.findByIdWithOwner(id)
                .map(q -> q.getTask() != null ? q.getTask().getExperience() : null)
                .map(this::isCreatedByCurrentUser)
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public boolean isOwnerOfAnswer(Long id) {
        if (isAdmin()) return true;
        return answerRepository.findByIdWithOwner(id)
                .map(a -> {
                    if (a.getQuestion() == null || a.getQuestion().getTask() == null) return null;
                    return a.getQuestion().getTask().getExperience();
                })
                .map(this::isCreatedByCurrentUser)
                .orElse(false);
    }

    @Transactional(readOnly = true)
    public boolean isOwnerOfSlot(Long id) {
        if (isAdmin()) return true;
        return slotRepository.findByIdWithOwner(id)
                .map(ExperienceSlot::getExperience)
                .map(this::isCreatedByCurrentUser)
                .orElse(false);
    }

    // ── Throw-on-fail variants (giữ để dùng trong service) ────────────────

    /**
     * Các method {@code require*Owner(...)} trước đây đã bị xóa — toàn bộ authorization
     * giờ chạy qua {@code @PreAuthorize(... isOwnerOfXxx(...))} ở controller layer.
     * Nếu cần check trong service, gọi thẳng {@code isOwnerOfXxx(...)} và xử lý boolean.
     */

    // ── internals ──────────────────────────────────────────────────────────

    private boolean isCreatedByCurrentUser(Experience exp) {
        if (exp == null || exp.getCreatedBy() == null) return false;
        Long currentUserId = com.journeygo.common.security.AuthorizationGuard.currentUserId();
        return currentUserId != null && currentUserId.equals(exp.getCreatedBy().getId());
    }

    private boolean isAdmin() {
        return com.journeygo.common.security.AuthorizationGuard.isAdmin();
    }
}
