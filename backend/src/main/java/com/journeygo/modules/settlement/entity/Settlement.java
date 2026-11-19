package com.journeygo.modules.settlement.entity;

import com.journeygo.modules.providerprofile.entity.ProviderProfile;
import com.journeygo.modules.settlement.entity.enums.SettlementScope;
import com.journeygo.modules.settlement.entity.enums.SettlementStatus;
import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Settlement — phiếu tổng hợp doanh thu cho một ProviderProfile trong một kỳ tất toán.
 *
 * <p>Quy tắc:
 * <ul>
 *   <li>Kỳ tất toán dùng tháng dương lịch; chỉ tạo cho kỳ đã kết thúc.</li>
 *   <li>Mỗi ProviderProfile chỉ có tối đa một Settlement đã duyệt cho mỗi kỳ doanh thu.</li>
 *   <li>Chỉ khi duyệt mới tạo giao dịch cộng tiền tương ứng trong Wallet.</li>
 *   <li>Duyệt phải nguyên tử: cập nhật Settlement + ProviderProfile Revenue + Wallet Transaction
 *       trong cùng một transaction, lỗi thì rollback toàn bộ.</li>
 * </ul>
 */
@Entity
@Table(name = "settlements", uniqueConstraints = {
        @UniqueConstraint(name = "uk_settlement_provider_profile_period", columnNames = {"provider_profile_id", "revenue_period"})
}, indexes = {
        @Index(name = "idx_settlement_provider_profile", columnList = "provider_profile_id"),
        @Index(name = "idx_settlement_status", columnList = "status"),
        @Index(name = "idx_settlement_period", columnList = "revenue_period"),
        @Index(name = "idx_settlement_scope", columnList = "scope")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Settlement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "settlement_code", nullable = false, unique = true, length = 32)
    private String settlementCode;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_profile_id")
    private ProviderProfile providerProfile;

    /**
     * Phạm vi đợt tất toán.
     *
     * <p>{@link SettlementScope#PROVIDER} — đợt của MỘT đối tác (mặc định, tương thích dữ liệu cũ).
     * {@link SettlementScope#BATCH} — đợt TỔNG cho cả sàn: gom khoản doanh thu đủ điều kiện
     * của TẤT CẢ đối tác trong kỳ vào một đợt; duyệt một lần, tiền vẫn cộng vào ví
     * của từng đối tác theo đúng số tiền của họ.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "scope", nullable = false, length = 20)
    @Builder.Default
    private SettlementScope scope = SettlementScope.PROVIDER;

    /** Kỳ doanh thu (yyyy-MM) mà Settlement này tổng hợp. */
    @Column(name = "revenue_period", nullable = false, length = 7)
    private String revenuePeriod;

    @Column(name = "period_start", nullable = false)
    private LocalDate periodStart;

    @Column(name = "period_end", nullable = false)
    private LocalDate periodEnd;

    /** Tổng số tiền thanh toán ban đầu của các khoản được chọn. */
    @Column(name = "gross_amount", nullable = false, precision = 16, scale = 2)
    @Builder.Default
    private BigDecimal grossAmount = BigDecimal.ZERO;

    /** Tổng Refund thành công. */
    @Column(name = "refund_amount", nullable = false, precision = 16, scale = 2)
    @Builder.Default
    private BigDecimal refundAmount = BigDecimal.ZERO;

    /** Tổng hoa hồng nền tảng. */
    @Column(name = "commission_amount", nullable = false, precision = 16, scale = 2)
    @Builder.Default
    private BigDecimal commissionAmount = BigDecimal.ZERO;

    /** Tổng điều chỉnh được duyệt. */
    @Column(name = "adjustment_amount", nullable = false, precision = 16, scale = 2)
    @Builder.Default
    private BigDecimal adjustmentAmount = BigDecimal.ZERO;

    /** Tổng tiền ProviderProfile được nhận — số tiền cộng vào Wallet khi duyệt. */
    @Column(name = "settlement_amount", nullable = false, precision = 16, scale = 2)
    @Builder.Default
    private BigDecimal settlementAmount = BigDecimal.ZERO;

    /**
     * Số đối tác có khoản doanh thu trong đợt.
     *
     * <p>Đợt của MỘT đối tác ⇒ luôn = 1. Đợt TỔNG ⇒ bằng số đối tác có khoản đủ điều kiện
     * trong kỳ (dùng để hiển thị "N đối tác" trên UI mà không phải đếm lại mỗi lần).
     */
    @Column(name = "partner_count", nullable = false, precision = 8, scale = 0)
    @Builder.Default
    private Integer partnerCount = 1;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private SettlementStatus status = SettlementStatus.DRAFT;

    /** Admin tạo đợt tất toán. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    /** Admin duyệt. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by")
    private User approvedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "approved_at")
    private Instant approvedAt;

    /** Lý do từ chối. */
    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    /** Ghi chú / nội dung đối soát. */
    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        if (this.status == null) {
            this.status = SettlementStatus.DRAFT;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    /** Duyệt Settlement — ghi nhận tài chính thành công. */
    public void approve(User approver) {
        this.status = SettlementStatus.APPROVED;
        this.approvedBy = approver;
        this.approvedAt = Instant.now();
    }

    /** Từ chối Settlement — không thay đổi số dư Wallet. */
    public void reject(User approver, String reason) {
        this.status = SettlementStatus.REJECTED;
        this.approvedBy = approver;
        this.approvedAt = Instant.now();
        this.rejectionReason = reason;
    }

    /** Hủy Settlement — không thay đổi số dư Wallet. */
    public void cancel(User approver, String reason) {
        this.status = SettlementStatus.CANCELLED;
        this.approvedBy = approver;
        this.approvedAt = Instant.now();
        this.rejectionReason = reason;
    }
}
