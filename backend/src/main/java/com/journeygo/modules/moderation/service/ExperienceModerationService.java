package com.journeygo.modules.moderation.service;

import com.journeygo.modules.experience.dto.response.ExperienceResponse;
import com.journeygo.modules.experience.entity.Experience;
import com.journeygo.modules.experience.entity.enums.ExperienceReviewStatus;
import com.journeygo.modules.experience.entity.enums.ExperienceStatus;
import com.journeygo.modules.experience.entity.enums.TaskStatus;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.experience.exception.ResourceNotFoundException;
import com.journeygo.modules.experience.repository.CheckInPointRepository;
import com.journeygo.modules.experience.repository.ExperienceRepository;
import com.journeygo.modules.experience.repository.TaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

/**
 * Kiểm duyệt riêng gói trải nghiệm (bước 3 trong quy trình thẩm định điểm đến).
 *
 * Duyệt: đánh dấu APPROVED; nếu điểm đến đã được duyệt thì phát hành ngay (kèm nhiệm vụ),
 * còn chưa thì sẽ phát hành khi điểm đến được duyệt.
 * Từ chối: đánh dấu REJECTED, đưa trải nghiệm và nhiệm vụ về bản nháp để đối tác sửa.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExperienceModerationService {

    private final ExperienceRepository experienceRepository;
    private final TaskRepository taskRepository;
    private final CheckInPointRepository checkInPointRepository;

    @Transactional
    public ExperienceResponse approve(Long experienceId, String note) {
        Experience e = findActiveOrThrow(experienceId);
        e.setReviewStatus(ExperienceReviewStatus.APPROVED);
        e.setReviewNote(note == null || note.isBlank() ? null : note.trim());
        e.setReviewedAt(Instant.now());
        if (e.getDestination() != null && e.getDestination().isApproved()) {
            e.setStatus(ExperienceStatus.PUBLISHED);
            taskRepository.updateStatusByExperience(e.getId(), TaskStatus.DRAFT, TaskStatus.PUBLISHED);
        }
        experienceRepository.save(e);
        log.info("Approved experience id={} (status={})", e.getId(), e.getStatus());
        return toResponse(e);
    }

    @Transactional
    public ExperienceResponse reject(Long experienceId, String note) {
        if (note == null || note.isBlank()) {
            throw new BusinessException("EXP-REVIEW-NOTE", "Vui lòng nhập lý do từ chối để đối tác chỉnh sửa");
        }
        Experience e = findActiveOrThrow(experienceId);
        e.setReviewStatus(ExperienceReviewStatus.REJECTED);
        e.setReviewNote(note.trim());
        e.setReviewedAt(Instant.now());
        e.setStatus(ExperienceStatus.DRAFT);
        taskRepository.updateStatusByExperience(e.getId(), TaskStatus.PUBLISHED, TaskStatus.DRAFT);
        experienceRepository.save(e);
        log.info("Rejected experience id={}", e.getId());
        return toResponse(e);
    }

    private Experience findActiveOrThrow(Long id) {
        Experience e = experienceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Experience", id));
        if (e.getStatus() == ExperienceStatus.INACTIVE) {
            throw new BusinessException("EXP-INACTIVE", "Trải nghiệm đã bị xóa, không thể kiểm duyệt");
        }
        return e;
    }

    private ExperienceResponse toResponse(Experience e) {
        return ExperienceResponse.fromEntity(e,
                (int) taskRepository.countByExperienceId(e.getId()),
                (int) checkInPointRepository.countByExperienceId(e.getId()));
    }
}
