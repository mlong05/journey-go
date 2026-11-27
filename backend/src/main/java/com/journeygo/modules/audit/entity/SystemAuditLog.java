package com.journeygo.modules.audit.entity;

import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Nhật ký kiểm toán hệ thống — bảng append-only ở cấp toàn sàn.
 *
 * <p>Khác với các bảng audit theo nghiệp vụ (refund_audit_logs, tour_review_history…),
 * bảng này ghi lại MỌI thao tác nhạy cảm ở cấp hệ thống: phân quyền, nội dung,
 * tài chính, kiểm duyệt — kèm IP nguồn và kết quả.
 *
 * <p>Bảng append-only — không bao giờ cập nhật/xoá dòng đã ghi.
 */
@Entity
@Table(name = "system_audit_logs", indexes = {
        @Index(name = "idx_system_audit_created_at", columnList = "created_at"),
        @Index(name = "idx_system_audit_actor", columnList = "actor_id"),
        @Index(name = "idx_system_audit_action", columnList = "action"),
        @Index(name = "idx_system_audit_category", columnList = "category"),
        @Index(name = "idx_system_audit_entity", columnList = "entity_type, entity_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SystemAuditLog {

    /** Nhóm thao tác — dùng để lọc nhanh trên UI. */
    public enum Category {
        AUTH,
        RBAC,
        CONTENT,
        FINANCE,
        MODERATION,
        REVIEW,
        SYSTEM
    }

    /** Kết quả thao tác. */
    public enum Outcome {
        SUCCESS,
        FAILURE,
        DENIED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Người thực hiện (null cho thao tác hệ thống / scheduler). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    /** Email người thực hiện — chụp lại tại thời điểm ghi (user có thể bị xoá sau này). */
    @Column(name = "actor_email", length = 100)
    private String actorEmail;

    /** Role của người thực hiện tại thời điểm ghi. */
    @Column(name = "actor_role", length = 40)
    private String actorRole;

    @Enumerated(EnumType.STRING)
    @Column(name = "category", nullable = false, length = 40)
    private Category category;

    @Column(name = "action", nullable = false, length = 60)
    private String action;

    @Column(name = "entity_type", length = 40)
    private String entityType;

    @Column(name = "entity_id", length = 64)
    private String entityId;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    @Enumerated(EnumType.STRING)
    @Column(name = "outcome", nullable = false, length = 20)
    @Builder.Default
    private Outcome outcome = Outcome.SUCCESS;

    @Column(name = "detail", columnDefinition = "TEXT")
    private String detail;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        if (createdAt == null) {
            createdAt = Instant.now();
        }
    }
}
