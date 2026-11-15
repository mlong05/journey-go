package com.journeygo.modules.refund.entity;

import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Nhóm lý do hoàn tiền — do Admin cấu hình trong tab "Cấu hình lý do hoàn tiền".
 *
 * <p>Đây là nguồn sự thật cho:
 * <ul>
 *   <li>Tên hiển thị tiếng Việt của nhóm (web hiển thị tên này, không hiển thị mã).</li>
 *   <li>Tỷ lệ hoàn tiền áp dụng cho nhóm (0.50 / 1.00 / 0.00).</li>
 *   <li>Mô tả điều kiện áp dụng hiển thị cho Tourist khi gửi yêu cầu.</li>
 * </ul>
 *
 * <p>Mã nhóm ({@link #code}) là enum {@code RefundReason} — cố định theo chính sách
 * (4 nhóm), còn nội dung hiển thị và tỷ lệ thì Admin được sửa.
 */
@Entity
@Table(name = "refund_reason_groups")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundReasonGroup {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Mã nhóm — khớp enum {@code RefundReason}. */
    @Column(name = "code", nullable = false, unique = true, length = 40)
    private String code;

    /** Tên hiển thị tiếng Việt. */
    @Column(name = "name", nullable = false, length = 150)
    private String name;

    /** Tỷ lệ hoàn tiền (0.50 = 50%, 1.00 = 100%, 0.00 = không hoàn). */
    @Column(name = "refund_rate", nullable = false, precision = 5, scale = 4)
    private BigDecimal refundRate;

    /** Mô tả điều kiện áp dụng — hiển thị cho Tourist. */
    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** true = nhóm bất khả kháng (không hoàn tiền). */
    @Column(name = "force_majeure", nullable = false)
    @Builder.Default
    private boolean forceMajeure = false;

    /** Thứ tự hiển thị. */
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
