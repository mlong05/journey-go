package com.journeygo.modules.experience.security;

import com.journeygo.modules.experience.entity.*;
import com.journeygo.modules.experience.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Optional;

@Component("experienceSecurityBean")
@RequiredArgsConstructor
public class ExperienceSecurity {

    private final ExperienceRepository experienceRepository;
    private final TaskRepository taskRepository;
    private final CheckInPointRepository checkInPointRepository;
    private final QuestionRepository questionRepository;
    private final AnswerRepository answerRepository;
    private final ExperienceSlotRepository slotRepository;


    @Transactional(readOnly = true)
    public boolean isOwnerOfExperience(Long id) {
        if (isAdmin()) return true;

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

    /**
     * Người gọi được xem mã QR của trạm check-in: chủ trải nghiệm, ADMIN hoặc MODERATOR.
     * Dùng trên endpoint công khai nên trả false (không ném lỗi) với khách chưa đăng nhập.
     */
    @Transactional(readOnly = true)
    public boolean canViewCheckInSecrets(Long experienceId) {
        if (isAdmin() || com.journeygo.common.security.AuthorizationGuard.hasRole("MODERATOR")) return true;
        var auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !(auth.getPrincipal() instanceof com.journeygo.security.UserPrincipal)) return false;
        return experienceId != null && isOwnerOfExperience(experienceId);
    }

    private boolean isCreatedByCurrentUser(Experience exp) {
        if (exp == null || exp.getCreatedBy() == null) return false;
        Long currentUserId = com.journeygo.common.security.AuthorizationGuard.currentUserId();
        return currentUserId != null && currentUserId.equals(exp.getCreatedBy().getId());
    }

    private boolean isAdmin() {
        return com.journeygo.common.security.AuthorizationGuard.isAdmin();
    }
}
