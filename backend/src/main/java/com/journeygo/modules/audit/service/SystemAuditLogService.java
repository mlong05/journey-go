package com.journeygo.modules.audit.service;

import com.journeygo.modules.audit.dto.SystemAuditLogResponse;
import com.journeygo.modules.audit.entity.SystemAuditLog;
import com.journeygo.modules.audit.repository.SystemAuditLogRepository;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import com.journeygo.security.UserPrincipal;
import jakarta.persistence.criteria.Predicate;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

/**
 * Nhật ký kiểm toán hệ thống — ghi nhận & truy vết thao tác nhạy cảm toàn sàn.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class SystemAuditLogService {

    private final SystemAuditLogRepository repository;
    private final UserRepository userRepository;

    // ── Ghi ───────────────────────────────────────────────────────────────────

    /**
     * Ghi một dòng nhật ký.
     *
     * <p>Dùng {@code REQUIRES_NEW} để việc ghi nhật ký KHÔNG bị rollback khi thao tác
     * nghiệp vụ thất bại — nhật ký phải ghi lại cả những lần thất bại.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(SystemAuditLog.Category category,
                    String action,
                    UserPrincipal actor,
                    String entityType,
                    String entityId,
                    String ipAddress,
                    SystemAuditLog.Outcome outcome,
                    String detail) {
        try {
            User actorEntity = null;
            String actorEmail = null;
            String actorRole = null;
            if (actor != null) {
                actorEmail = actor.getEmail();
                actorRole = actor.getAuthorities() == null || actor.getAuthorities().isEmpty()
                        ? null
                        : actor.getAuthorities().iterator().next().getAuthority().replace("ROLE_", "");
                actorEntity = userRepository.findById(actor.getId()).orElse(null);
            }
            repository.save(SystemAuditLog.builder()
                    .actor(actorEntity)
                    .actorEmail(actorEmail)
                    .actorRole(actorRole)
                    .category(category)
                    .action(action)
                    .entityType(entityType)
                    .entityId(entityId)
                    .ipAddress(ipAddress)
                    .outcome(outcome == null ? SystemAuditLog.Outcome.SUCCESS : outcome)
                    .detail(detail)
                    .build());
        } catch (Exception ex) {
            // ⚠️ Ghi nhật ký thất bại KHÔNG được làm hỏng thao tác nghiệp vụ.
            log.warn("[AuditLog] Không ghi được nhật ký action={} : {}", action, ex.getMessage());
        }
    }

    /** Ghi nhật ký thao tác thành công. */
    public void logSuccess(SystemAuditLog.Category category, String action, UserPrincipal actor,
                           String entityType, String entityId, String ipAddress, String detail) {
        log(category, action, actor, entityType, entityId, ipAddress,
                SystemAuditLog.Outcome.SUCCESS, detail);
    }

    /** Ghi nhật ký thao tác bị từ chối (không đủ quyền / vi phạm chính sách). */
    public void logDenied(SystemAuditLog.Category category, String action, UserPrincipal actor,
                          String entityType, String entityId, String ipAddress, String detail) {
        log(category, action, actor, entityType, entityId, ipAddress,
                SystemAuditLog.Outcome.DENIED, detail);
    }

    // ── Đọc ───────────────────────────────────────────────────────────────────

    /**
     * Danh sách nhật ký có lọc.
     *
     * @param category nhóm thao tác (null = tất cả)
     * @param action   hành động cụ thể (null = tất cả)
     * @param actorId  người thực hiện (null = tất cả)
     * @param keyword  tìm trong email / action / entity / detail
     */
    @Transactional(readOnly = true)
    public Page<SystemAuditLogResponse> list(String category,
                                             String action,
                                             Long actorId,
                                             String keyword,
                                             Pageable pageable) {
        Specification<SystemAuditLog> spec = (root, query, cb) -> {
            List<Predicate> predicates = new ArrayList<>();

            if (category != null && !category.isBlank()) {
                predicates.add(cb.equal(root.get("category"), SystemAuditLog.Category.valueOf(category)));
            }
            if (action != null && !action.isBlank()) {
                predicates.add(cb.equal(root.get("action"), action));
            }
            if (actorId != null) {
                predicates.add(cb.equal(root.get("actor").get("id"), actorId));
            }
            if (keyword != null && !keyword.isBlank()) {
                String like = "%" + keyword.trim().toLowerCase() + "%";
                predicates.add(cb.or(
                        cb.like(cb.lower(root.get("actorEmail")), like),
                        cb.like(cb.lower(root.get("action")), like),
                        cb.like(cb.lower(root.get("entityType")), like),
                        cb.like(cb.lower(root.get("entityId")), like),
                        cb.like(cb.lower(cb.coalesce(root.get("detail"), "")), like)));
            }
            return cb.and(predicates.toArray(new Predicate[0]));
        };

        return repository.findAll(spec, pageable).map(SystemAuditLogResponse::fromEntity);
    }

    /** Danh sách hành động đã có trong nhật ký (dùng cho bộ lọc dropdown). */
    @Transactional(readOnly = true)
    public List<String> knownActions() {
        return repository.findAll().stream()
                .map(SystemAuditLog::getAction)
                .filter(a -> a != null)
                .distinct()
                .sorted()
                .toList();
    }
}
