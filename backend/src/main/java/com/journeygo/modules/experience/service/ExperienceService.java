package com.journeygo.modules.experience.service;

import com.journeygo.common.security.AuthorizationGuard;
import com.journeygo.modules.experience.dto.request   .ChangeExperienceStatusRequest;
import com.journeygo.modules.experience.dto.request.CreateExperienceRequest;
import com.journeygo.modules.experience.dto.request.UpdateExperienceRequest;
import com.journeygo.modules.experience.dto.response.ExperienceResponse;
import com.journeygo.modules.experience.entity.Experience;
import com.journeygo.modules.experience.entity.enums.ExperienceStatus;
import com.journeygo.modules.experience.entity.enums.TaskStatus;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.experience.exception.ResourceNotFoundException;
import com.journeygo.modules.experience.repository.ExperienceRepository;
import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.repository.DestinationRepository;
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
    private final DestinationRepository destinationRepository;
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
    public List<ExperienceResponse> getByDestinationId(Long destinationId) {
        return experienceRepository.findByDestinationIdWithOwner(destinationId).stream()
                .filter(this::isAccessibleToCurrentUser)
                .map(this::toResponseWithCounts)
                .toList();
    }

    @Transactional(readOnly = true)
    public Page<ExperienceResponse> list(ExperienceStatus status, boolean includeInactive, Long destinationId, Pageable pageable) {
        Page<Experience> page;
        if (destinationId != null) {
            if (status != null) {
                page = experienceRepository.findByDestinationIdAndStatusWithCreatedBy(destinationId, status, pageable);
            } else if (includeInactive) {
                page = experienceRepository.findByDestinationIdWithCreatedBy(destinationId, pageable);
            } else {
                page = experienceRepository.findByDestinationIdAndStatusNotWithCreatedBy(
                        destinationId, ExperienceStatus.INACTIVE, pageable);
            }
        } else if (status != null) {
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

    /**
     * Danh sách Experience của một user (PROVIDER xem của mình).
     * Mặc định ẩn INACTIVE (soft-deleted).
     */
    @Transactional(readOnly = true)
    public Page<ExperienceResponse> listByOwner(Long ownerId, ExperienceStatus status, boolean includeInactive, Long destinationId, Pageable pageable) {
        Page<Experience> page;
        if (destinationId != null) {
            if (status != null) {
                page = experienceRepository.findByCreatedByIdAndDestinationIdAndStatus(
                        ownerId, destinationId, status, pageable);
            } else if (includeInactive) {
                page = experienceRepository.findByCreatedByIdAndDestinationId(
                        ownerId, destinationId, pageable);
            } else {
                page = experienceRepository.findByCreatedByIdAndDestinationIdAndStatusNot(
                        ownerId, destinationId, ExperienceStatus.INACTIVE, pageable);
            }
        } else if (status != null) {
            page = experienceRepository.findByStatusWithCreatedBy(status, pageable);
        } else if (includeInactive) {
            page = experienceRepository.findByCreatedById(ownerId, pageable);
        } else {
            page = experienceRepository.findByCreatedByIdAndStatusNot(ownerId, ExperienceStatus.INACTIVE, pageable);
        }
        return page.map(this::toResponseWithCounts);
    }


    private ExperienceResponse toResponseWithCounts(Experience e) {
        int taskCount = (int) taskRepository.countByExperienceId(e.getId());
        int cipCount = (int) checkInPointRepository.countByExperienceId(e.getId());
        return ExperienceResponse.fromEntity(e, taskCount, cipCount);
    }


    @Transactional
    public ExperienceResponse create(CreateExperienceRequest req, Long creatorId) {

        Destination destination = destinationRepository.findByIdAndDeletedFalse(req.destinationId())
                .orElseThrow(() -> new ResourceNotFoundException("Destination", req.destinationId()));

        User creator = userRepository.findById(creatorId)
                .orElseThrow(() -> new ResourceNotFoundException("User", creatorId));

        Experience e = Experience.builder()
                .destination(destination)
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

        // Idempotent: nếu đã INACTIVE thì không ghi đè log nữa, tránh tốn transaction thừa.
        if (e.getStatus() == ExperienceStatus.INACTIVE) {
            log.info("Experience id={} đã ở trạng thái INACTIVE, bỏ qua softDelete", id);
            return;
        }

        e.setStatus(ExperienceStatus.INACTIVE);
        experienceRepository.save(e);
        log.info("Experience id={} soft-deleted → INACTIVE", id);
    }

    /**
     * Đổi trạng thái Experience (chỉ DRAFT ↔ PUBLISHED — INACTIVE chỉ set bằng xoá mềm).
     * Chỉ owner (PROVIDER/ADMIN) được thực hiện; controller đã chặn ở @PreAuthorize.
     *
     * @throws BusinessException "BR-EXP-3" khi đổi INACTIVE → ? ; "BR-EXP-2" khi status mới không hợp lệ.
     */
    @Transactional
    public ExperienceResponse changeStatus(Long id, ChangeExperienceStatusRequest req) {
        Experience e = findOrThrow(id);
        ExperienceStatus newStatus = req.status();

        // Không cho đổi status của Experience đã ngừng hoạt động
        if (e.getStatus() == ExperienceStatus.INACTIVE) {
            throw new BusinessException("BR-EXP-3",
                    "Experience đã ở trạng thái INACTIVE. Cần tạo mới thay vì đổi trạng thái.");
        }

        // Chỉ chấp nhận DRAFT hoặc PUBLISHED làm status mới
        if (newStatus != ExperienceStatus.DRAFT && newStatus != ExperienceStatus.PUBLISHED) {
            throw new BusinessException("BR-EXP-3-CHG",
                    "Chỉ có thể chuyển sang DRAFT hoặc PUBLISHED. INACTIVE là xoá mềm.");
        }

        // Idempotent: nếu trùng status hiện tại thì trả về luôn
        if (e.getStatus() == newStatus) {
            log.info("Experience id={} đã ở trạng thái {}, bỏ qua changeStatus", id, newStatus);
        } else {
            ExperienceStatus old = e.getStatus();
            e.setStatus(newStatus);
            experienceRepository.save(e);
            log.info("Experience id={} status: {} → {}", id, old, newStatus);
        }

        // Nhiệm vụ đi theo trạng thái của Experience: hành trình của du khách chỉ dùng Task PUBLISHED,
        // còn sửa nhiệm vụ / câu hỏi / đáp án cần Task DRAFT. Chạy cả khi trùng status để sửa dữ liệu lệch.
        int synced = newStatus == ExperienceStatus.PUBLISHED
                ? taskRepository.updateStatusByExperience(e.getId(), TaskStatus.DRAFT, TaskStatus.PUBLISHED)
                : taskRepository.updateStatusByExperience(e.getId(), TaskStatus.PUBLISHED, TaskStatus.DRAFT);
        if (synced > 0) {
            log.info("Experience id={}: chuyển {} nhiệm vụ sang {}", id, synced,
                    newStatus == ExperienceStatus.PUBLISHED ? TaskStatus.PUBLISHED : TaskStatus.DRAFT);
        }

        int taskCount = (int) taskRepository.countByExperienceId(e.getId());
        int cipCount = (int) checkInPointRepository.countByExperienceId(e.getId());
        return ExperienceResponse.fromEntity(e, taskCount, cipCount);
    }

    private Experience findOrThrow(Long id) {
        return experienceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Experience", id));
    }


    private boolean isAccessibleToCurrentUser(Experience e) {
        if (e.getStatus() == ExperienceStatus.INACTIVE) {
            return false;
        }
        if (e.getStatus() == ExperienceStatus.PUBLISHED) {
            return true;
        }
        if (e.getStatus() == ExperienceStatus.DRAFT) {
            try {
                if (AuthorizationGuard.isAdmin() || AuthorizationGuard.hasRole("MODERATOR")) {
                    return true;
                }
                Long ownerId = e.getCreatedBy() != null ? e.getCreatedBy().getId() : null;
                return ownerId != null && ownerId.equals(AuthorizationGuard.currentUserId());
            } catch (Exception ignored) {
                return false;
            }
        }
        return false;
    }

    private void hideDraftFromNonOwner(Experience e) {
        if (!isAccessibleToCurrentUser(e)) {
            throw new ResourceNotFoundException("Experience", e.getId());
        }
    }
}
