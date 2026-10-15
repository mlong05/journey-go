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

/**
 * Service chính của Experience — CRUD thuần.
 *
 * Quy tắc nghiệp vụ:
 *   - BR-EXP-1: 1 Destination chỉ có 1 Experience.
 *   - BR-EXP-2: chỉ update được khi status = DRAFT.
 *   - BR-EXP-3: PUBLISHED không xóa, chỉ INACTIVE.
 *
 * Lưu ý: KHÔNG có submit/moderate vì moderation workflow cần chờ
 * content cultural từ module destination. Sẽ thêm lại sau.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ExperienceService {

    private final ExperienceRepository experienceRepository;
    private final UserRepository userRepository;
    private final TaskRepository taskRepository;
    private final CheckInPointRepository checkInPointRepository;

    // ── Read ────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ExperienceResponse getById(Long id) {
        // Chỉ fetch Experience + createdBy; count từng collection riêng để tránh
        // MultipleBagFetchException (không fetch nhiều List cùng lúc).
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
        // Mặc định ẩn INACTIVE (soft-deleted) để tránh leak lên public list.
        // Admin có thể truyền includeInactive=true để thấy tất cả.
        // Dùng query có @EntityGraph(createdBy) để tránh N+1 khi map response.
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
        // Bỏ PageRequest.of(0, Integer.MAX_VALUE) — thay bằng method repository không phân trang
        // (chỉ dùng cho admin/debug; nếu data lớn thì cần cap bằng @Query LIMIT).
        return experienceRepository.findByStatusIn(statuses,
                        org.springframework.data.domain.PageRequest.of(0, 500))
                .map(this::toResponseWithCounts)
                .getContent();
    }

    /**
     * Map Experience → ExperienceResponse với count từ sub-query, tránh lazy load.
     */
    private ExperienceResponse toResponseWithCounts(Experience e) {
        int taskCount = (int) taskRepository.countByExperienceId(e.getId());
        int cipCount = (int) checkInPointRepository.countByExperienceId(e.getId());
        return ExperienceResponse.fromEntity(e, taskCount, cipCount);
    }

    // ── Create ──────────────────────────────────────────────────────────────

    /**
     * Tạo Experience mới.
     *
     * <p>BR-EXP-1: 1 Destination chỉ có 1 Experience.</p>
     *
     * <p>Chống race condition bằng 2 lớp:</p>
     * <ol>
     *   <li>DB-level UNIQUE constraint trên {@code destination_id}
     *       (xem {@code db/migration/V*.sql} + reset script).</li>
     *   <li>Application-level pre-check {@code existsByDestinationId()}.</li>
     * </ol>
     * <p>Nếu 2 request cùng lúc qua pre-check, DB sẽ reject request sau
     * bằng {@code DataIntegrityViolationException} → được {@code GlobalExceptionHandler}
     * chuyển thành 400 Bad Request (BR-EXP-1).</p>
     */
    @Transactional
    public ExperienceResponse create(CreateExperienceRequest req, Long creatorId) {
        // BR-EXP-1 (lớp 1: pre-check)
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

        // Lưu ý: nếu UNIQUE constraint ở DB bị vi phạm do race condition,
        // DataIntegrityViolationException sẽ nổ ra ở đây và được
        // GlobalExceptionHandler chuyển thành 400 Bad Request (BR-EXP-1).
        Experience saved = experienceRepository.saveAndFlush(e);
        log.info("Created Experience id={} by user={}", saved.getId(), creatorId);
        // saved vừa insert nên count thật = 0 (chưa có Task / CIP nào).
        return ExperienceResponse.fromEntity(saved, 0, 0);
    }

    // ── Update ──────────────────────────────────────────────────────────────

    @Transactional
    public ExperienceResponse update(Long id, UpdateExperienceRequest req) {
        Experience e = findOrThrow(id);
        // BR-EXP-2: chỉ update khi DRAFT
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
        // Đếm lại sau update (Experience có thể đã có Task/CIP từ trước).
        int taskCount = (int) taskRepository.countByExperienceId(saved.getId());
        int cipCount = (int) checkInPointRepository.countByExperienceId(saved.getId());
        return ExperienceResponse.fromEntity(saved, taskCount, cipCount);
    }

    // ── Soft delete (BR-EXP-3) ──────────────────────────────────────────────

    @Transactional
    public void softDelete(Long id) {
        Experience e = findOrThrow(id);
        // BR-EXP-3: DRAFT/PUBLISHED đều set INACTIVE (soft delete)
        e.setStatus(ExperienceStatus.INACTIVE);
        experienceRepository.save(e);
        log.info("Experience id={} soft-deleted → INACTIVE", id);
    }

    // ── internal ────────────────────────────────────────────────────────────

    private Experience findOrThrow(Long id) {
        return experienceRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Experience", id));
    }

    /**
     * Nếu Experience ở DRAFT, chỉ owner hoặc ADMIN mới được xem.
     * Ngược lại trả về 404 (giả vờ không tồn tại) để tránh leak.
     */
    private void hideDraftFromNonOwner(Experience e) {
        if (e.getStatus() == ExperienceStatus.DRAFT) {
            // ADMIN xem được hết
            if (com.journeygo.common.security.AuthorizationGuard.isAdmin()) return;
            // Owner xem được
            Long ownerId = e.getCreatedBy() != null ? e.getCreatedBy().getId() : null;
            if (ownerId != null && ownerId.equals(com.journeygo.common.security.AuthorizationGuard.currentUserId())) {
                return;
            }
            throw new ResourceNotFoundException("Experience", e.getId());
        }
    }
}