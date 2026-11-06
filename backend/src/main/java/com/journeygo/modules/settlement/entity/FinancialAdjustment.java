package com.journeygo.modules.settlement.entity;

import com.journeygo.modules.providerprofile.entity.ProviderProfile;
import com.journeygo.modules.refund.entity.RefundRequest;
import com.journeygo.modules.settlement.entity.enums.FinancialAdjustmentStatus;
import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Financial Adjustment — khoản điều chỉnh tài chính có căn cứ và trạng thái phê duyệt.
 *
 * <p>Dùng cho:
 * <ul>
 *   <li>Refund phát sinh <b>sau</b> khi Settlement đã được duyệt — không sửa lịch sử đã duyệt,
 *       mà tạo khoản điều chỉnh riêng có liên kết nguồn.</li>
 *   <li>Bồi hoàn chi phí cho ProviderProfile do lỗi nền tảng (chính sách được phê duyệt).</li>
 *   <li>Điều chỉnh thủ công bởi Admin.</li>
 * </ul>
 */
@Entity
@Table(name = "financial_adjustments", indexes = {
        @Index(name = "idx_fin_adj_provider_profile", columnList = "provider_profile_id"),
        @Index(name = "idx_fin_adj_status", columnList = "status"),
        @Index(name = "idx_fin_adj_refund", columnList = "refund_request_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialAdjustment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "provider_profile_id", nullable = false)
    private ProviderProfile providerProfile;

    /** Refund gốc gây ra khoản điều chỉnh (nếu có). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "refund_request_id")
    private RefundRequest refundRequest;

    /** Settlement gốc (nếu điều chỉnh phát sinh sau khi tất toán). */
    @Column(name = "source_settlement_id")
    private Long sourceSettlementId;

    /** Số tiền điều chỉnh — dương = cộng, âm = trừ. */
    @Column(name = "amount", nullable = false, precision = 16, scale = 2)
    private BigDecimal amount;

    @Column(name = "currency", nullable = false, length = 3)
    @Builder.Default
    private String currency = "VND";

    /** Lý do điều chỉnh (bắt buộc). */
    @Column(name = "reason", nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private FinancialAdjustmentStatus status = FinancialAdjustmentStatus.PENDING;

    /** Admin tạo / phê duyệt. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    @Column(name = "approved_at")
    private Instant approvedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        if (this.status == null) {
            this.status = FinancialAdjustmentStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public void approve(User approver) {
        this.status = FinancialAdjustmentStatus.APPROVED;
        this.approvedBy = approver;
        this.approvedAt = Instant.now();
    }

    public void reject(User approver, String rejectionReason) {
        this.status = FinancialAdjustmentStatus.REJECTED;
        this.approvedBy = approver;
        this.approvedAt = Instant.now();
        this.reason = rejectionReason;
    }
}
