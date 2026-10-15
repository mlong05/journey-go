package com.journeygo.modules.experience.service;

import com.journeygo.common.security.AuthorizationGuard;
import com.journeygo.modules.experience.dto.request.CreateExperienceRequest;
import com.journeygo.modules.experience.dto.request.UpdateExperienceRequest;
import com.journeygo.modules.experience.dto.response.ExperienceResponse;
import com.journeygo.modules.experience.entity.Experience;
import com.journeygo.modules.experience.entity.enums.ExperienceStatus;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.experience.exception.ResourceNotFoundException;
import com.journeygo.modules.experience.repository.ExperienceRepository;
import com.journeygo.modules.experience.repository.TaskRepository;
import com.journeygo.modules.experience.repository.CheckInPointRepository;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class ExperienceService {

    private final ExperienceRepository experienceRepository;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final CheckInPointRepository checkInPointRepository;

    @Transactional(readOnly = true)
    public ExperienceResponse getById(Long id) {

        Experience e = experienceRepository.findByIdWithOwner(id)
                .orElseThrow(() -> new ResourceNotFoundException("Experience", id));
        hideDraftFromNonOwner(e);
        int taskCount = (int) taskRepository.countByExperienceId(e.getId());
        int cipCount = (int) checkInPointRepository.countByExperienceId(e.getId());
        return ExperienceResponse.fromEntity(e, taskCount, cipCount);
    }

    @Transactional(readOnly = true)
    public ExperienceResponse getByDestinationId(Long destinationId) {
        Experience e = experienceRepository.findByDestinationIdWithOwner(destinationId)
                .orElseThrow(() -> new ResourceNotFoundException("Experience", "destinationId", destinationId));
        hideDraftFromNonOwner(e);
        int taskCount = (int) taskRepository.countByExperienceId(e.getId());
        int cipCount = (int) checkInPointRepository.countByExperienceId(e.getId());
        return ExperienceResponse.fromEntity(e, taskCount, cipCount);
    }

    @Transactional(readOnly = true)
    public Page<ExperienceResponse> list(ExperienceStatus status, boolean includeInactive, Pageable pageable) {

        Page<Experience> page;
        if (status != null) {
            page = experienceRepository.findByStatusWithCreatedBy(status, pageable);
        } else if (includeInactive) {
            page = experienceRepository.findAllWithCreatedBy(pageable);
        } else {
            page = experienceRepository.findByStatusNotWithCreatedBy(ExperienceStatus.INACTIVE, pageable);
        }
        return page.map(this::toResponseWithCounts);
    }

    @Transactional(readOnly = true)
    public List<ExperienceResponse> listByStatuses(List<ExperienceStatus> statuses) {

        return experienceRepository.findByStatusIn(statuses,
                        org.springframework.data.domain.PageRequest.of(0, 500))
                .map(this::toResponseWithCounts)
                .getContent();
    }


    private ExperienceResponse toResponseWithCounts(Experience e) {
        int taskCount = (int) taskRepository.countByExperienceId(e.getId());
        int cipCount = (int) checkInPointRepository.countByExperienceId(e.getId());
        return ExperienceResponse.fromEntity(e, taskCount, cipCount);
    }


    @Transactional
    public ExperienceResponse create(CreateExperienceRequest req, Long creatorId) {

        if (experienceRepository.existsByDestinationId(req.destinationId())) {
            throw new BusinessException("BR-EXP-1",
                    "Destination " + req.destinationId() + " đã có Experience. Mỗi Destination chỉ có 1 Experience.");
        }

        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("User", creatorId));

        Experience e = Experience.builder()
                .destinationId(req.destinationId())
                .title(req.title())
                .description(req.description())
                .price(req.price() != null ? req.price() : BigDecimal.ZERO)
                .currency(req.currency() != null ? req.currency() : "VND")
                .durationMinutes(req.durationMinutes())
                .status(ExperienceStatus.DRAFT)   // mặc định DRAFT
                .createdBy(creator)
                .build();

        Experience saved = experienceRepository.saveAndFlush(e);
        log.info("Created Experience id={} by user={}", saved.getId(), creatorId);

        return ExperienceResponse.fromEntity(saved, 0, 0);
    }

    @Transactional
    public ExperienceResponse update(Long id, UpdateExperienceRequest req) {
        Experience e = findOrThrow(id);

        if (e.getStatus() != ExperienceStatus.DRAFT) {
            throw new BusinessException("BR-EXP-2",
                    "Experience chỉ cập nhật được khi status = DRAFT. Hiện tại: " + e.getStatus());
        }

        if (req.title() != null) e.setTitle(req.title());
        if (req.description() != null) e.setDescription(req.description());
        if (req.price() != null) e.setPrice(req.price());
        if (req.currency() != null) e.setCurrency(req.currency());
        if (req.durationMinutes() != null) e.setDurationMinutes(req.durationMinutes());

        Experience saved = experienceRepository.save(e);
        log.info("Updated Experience id={}", saved.getId());

        int taskCount = (int) taskRepository.countByExperienceId(saved.getId());
        int cipCount = (int) checkInPointRepository.countByExperienceId(saved.getId());
        return ExperienceResponse.fromEntity(saved, taskCount, cipCount);
    }

    @Transactional
    public void softDelete(Long id) {
        Experience e = findOrThrow(id);

        e.setStatus(ExperienceStatus.INACTIVE);
        experienceRepository.save(e);
        log.info("Experience id={} soft-deleted → INACTIVE", id);
    }

    private Experience findOrThrow(Long id) {
        return experienceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Experience", id));
    }


    private void hideDraftFromNonOwner(Experience e) {
        if (e.getStatus() == ExperienceStatus.DRAFT) {

            if (com.journeygo.common.security.AuthorizationGuard.isAdmin()) return;

            Long ownerId = e.getCreatedBy() != null ? e.getCreatedBy().getId() : null;
            if (ownerId != null && ownerId.equals(com.journeygo.common.security.AuthorizationGuard.currentUserId())) {
                return;
            }
            throw new ResourceNotFoundException("Experience", e.getId());
        }
    }
}
