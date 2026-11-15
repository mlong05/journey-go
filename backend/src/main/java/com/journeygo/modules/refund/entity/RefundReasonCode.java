package com.journeygo.modules.refund.entity;

import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Mã lý do hoàn tiền chi tiết — thuộc một {@link RefundReasonGroup}.
 *
 * <p>Ví dụ: nhóm {@code PERSONAL} có các mã "Bị bệnh hoặc gặp vấn đề sức khỏe",
 * "Tai nạn cá nhân", "Công việc đột xuất"…
 *
 * <p>Admin có thể thêm / sửa / xóa trong tab "Cấu hình lý do hoàn tiền" — không
 * hardcode danh sách trong code.
 */
@Entity
@Table(name = "refund_reason_codes")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundReasonCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Mã lý do chi tiết, duy nhất toàn hệ thống (VD: HEALTH_ISSUE). */
    @Column(name = "code", nullable = false, unique = true, length = 60)
    private String code;

    /** Nhóm lý do chứa mã này. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "group_id", nullable = false)
    private RefundReasonGroup group;

    /** Tên hiển thị tiếng Việt. */
    @Column(name = "name", nullable = false, length = 255)
    private String name;

    /** Điều kiện áp dụng — Admin đối chiếu bằng chứng theo mô tả này. */
    @Column(name = "conditions", columnDefinition = "TEXT")
    private String conditions;

    /** true = bắt buộc đính kèm bằng chứng khi Tourist gửi yêu cầu. */
    @Column(name = "require_evidence", nullable = false)
    @Builder.Default
    private boolean requireEvidence = false;

    /** Thứ tự hiển thị trong nhóm. */
    @Column(name = "display_order", nullable = false)
    @Builder.Default
    private int displayOrder = 0;

    /** true = đang bật. */
    @Column(name = "active", nullable = false)
    @Builder.Default
    private boolean active = true;

    /** Admin tạo / sửa. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
