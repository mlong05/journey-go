package com.journeygo.modules.refund.entity;

import com.journeygo.modules.refund.entity.enums.RefundStatus;
import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Nhật ký kiểm toán Refund (audit log).
 *
 * <p>Quy tắc nghiệp vụ: "Mọi thao tác tạo, phê duyệt, từ chối, gửi hoàn tiền và cập nhật kết quả
 * phải được ghi nhận để phục vụ đối soát và kiểm toán."
 *
 * <p>Bảng này append-only — không bao giờ cập nhật/xoá dòng đã ghi.
 */
@Entity
@Table(name = "refund_audit_logs", indexes = {
        @Index(name = "idx_refund_audit_refund", columnList = "refund_request_id"),
        @Index(name = "idx_refund_audit_action", columnList = "action")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundAuditLog {

    /** Hành động được ghi nhận. */
    public enum Action {
        CREATED,
        APPROVED,
        REJECTED,
        VNPAY_REQUEST_SENT,
        VNPAY_RESPONSE,
        VNPAY_STATUS_UPDATED,
        MANUAL_TRANSFER_RECORDED,
        MANUAL_TRANSFER_CONFIRMED,
        STATUS_UPDATED,
        CANCELLED
    }

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "refund_request_id", nullable = false)
    private RefundRequest refundRequest;

    @Enumerated(EnumType.STRING)
    @Column(name = "action", nullable = false, length = 40)
    private Action action;

    @Enumerated(EnumType.STRING)
    @Column(name = "from_status", length = 30)
    private RefundStatus fromStatus;

    @Enumerated(EnumType.STRING)
    @Column(name = "to_status", length = 30)
    private RefundStatus toStatus;

    /** Người thực hiện (null cho thao tác hệ thống). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "performed_by")
    private User performedBy;

    /** Số tiền liên quan tới thao tác. */
    @Column(name = "amount", precision = 14, scale = 2)
    private BigDecimal amount;

    /** Mã tham chiếu giao dịch (transfer reference / vnp request id). */
    @Column(name = "reference", length = 100)
    private String reference;

    /** Chi tiết / ghi chú. */
    @Column(name = "detail", columnDefinition = "TEXT")
    private String detail;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}
