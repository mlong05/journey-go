package com.journeygo.modules.providerrevenue.entity;

import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.providerprofile.entity.ProviderProfile;
import com.journeygo.modules.providerrevenue.entity.enums.DeferredReason;
import com.journeygo.modules.providerrevenue.entity.enums.ProviderRevenueStatus;
import com.journeygo.modules.payment.entity.Payment;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.time.YearMonth;

/**
 * ProviderProfile Revenue — bản ghi doanh thu của ProviderProfile phát sinh từ một Booking.
 *
 * <p>Quy tắc nghiệp vụ:
 * <ul>
 *   <li>Gắn với Payment <b>thực sự</b> được dùng để thanh toán Booking — mỗi Booking chỉ có
 *       một nguồn doanh thu hợp lệ (ràng buộc duy nhất {@code booking_id}).</li>
 *   <li>Kỳ doanh thu ({@code revenuePeriod}) xác định theo <b>tháng hoàn thành trải nghiệm</b>,
 *       không phải tháng thanh toán.</li>
 *   <li>Số tiền tiền tệ dùng {@code DECIMAL} — không dùng số thực dấu phẩy động.</li>
 *   <li>Không chuyển {@code SETTLED} về {@code PENDING} để xử lý Refund — phải dùng giao dịch
 *       điều chỉnh riêng.</li>
 * </ul>
 */
@Entity
@Table(name = "provider_revenues", uniqueConstraints = {
        // Một Booking có thể chứa nhiều Experience thuộc các ProviderProfile khác nhau → mỗi
        // ProviderProfile có tối đa MỘT bản ghi doanh thu cho một Booking.
        @UniqueConstraint(name = "uk_provider_revenue_booking_provider", columnNames = {"booking_id", "provider_profile_id"}),
        // Tương tự với Payment — mỗi ProviderProfile có tối đa một bản ghi cho mỗi Payment.
        @UniqueConstraint(name = "uk_provider_revenue_payment_provider", columnNames = {"payment_id", "provider_profile_id"})
}, indexes = {
        @Index(name = "idx_revenue_provider_profile", columnList = "provider_profile_id"),
        @Index(name = "idx_revenue_status", columnList = "status"),
        @Index(name = "idx_revenue_period", columnList = "revenue_period"),
        @Index(name = "idx_revenue_settlement", columnList = "settlement_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProviderRevenue {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "provider_profile_id", nullable = false)
    private ProviderProfile providerProfile;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    /** Payment được dùng để thanh toán Booking. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "payment_id", nullable = false)
    private Payment payment;

    /** Kỳ doanh thu — tháng hoàn thành trải nghiệm (yyyy-MM). */
    @Column(name = "revenue_period", nullable = false, length = 7)
    private String revenuePeriod;

    /** Ngày hoàn thành trải nghiệm — căn cứ xác định kỳ doanh thu. */
    @Column(name = "completed_date")
    private LocalDate completedDate;

    /** Số tiền thanh toán thành công ban đầu. */
    @Column(name = "gross_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal grossAmount;

    /** Tổng Refund đã hoàn thành thành công. */
    @Column(name = "refund_amount", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal refundAmount = BigDecimal.ZERO;

    /** Hoa hồng nền tảng. */
    @Column(name = "commission_amount", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal commissionAmount = BigDecimal.ZERO;

    /** Tỷ lệ hoa hồng đã áp dụng — lưu lại để đối soát về sau. */
    @Column(name = "commission_rate", nullable = false, precision = 5, scale = 4)
    @Builder.Default
    private BigDecimal commissionRate = BigDecimal.ZERO;

    /** Tổng điều chỉnh được duyệt (có thể dương hoặc âm). */
    @Column(name = "adjustment_amount", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal adjustmentAmount = BigDecimal.ZERO;

    /** Số tiền ProviderProfile được nhận sau tính toán. */
    @Column(name = "provider_net_amount", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal providerNetAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private ProviderRevenueStatus status = ProviderRevenueStatus.PENDING;

    /** Lý do chưa đủ điều kiện (nếu có). */
    @Enumerated(EnumType.STRING)
    @Column(name = "deferred_reason", length = 40)
    private DeferredReason deferredReason;

    /** Settlement đang giữ khoản doanh thu (nếu có). */
    @Column(name = "settlement_id")
    private Long settlementId;

    /** Thời điểm lần đầu đáp ứng điều kiện tất toán. */
    @Column(name = "eligible_at")
    private Instant eligibleAt;

    /** Thời điểm khoản doanh thu được tất toán. */
    @Column(name = "settled_at")
    private Instant settledAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        if (this.status == null) {
            this.status = ProviderRevenueStatus.PENDING;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    /**
     * Tính lại toàn bộ số tiền theo công thức:
     * <pre>
     * NetCollected    = GrossAmount − SuccessfulRefundAmount
     * Commission      = NetCollected × CommissionRate
     * ProviderNetAmount = NetCollected − Commission + ApprovedAdjustments
     * </pre>
     */
    public void recalculate() {
        BigDecimal gross = grossAmount != null ? grossAmount : BigDecimal.ZERO;
        BigDecimal refund = refundAmount != null ? refundAmount : BigDecimal.ZERO;
        BigDecimal rate = commissionRate != null ? commissionRate : BigDecimal.ZERO;
        BigDecimal adjustment = adjustmentAmount != null ? adjustmentAmount : BigDecimal.ZERO;

        BigDecimal netCollected = gross.subtract(refund);
        if (netCollected.compareTo(BigDecimal.ZERO) < 0) {
            netCollected = BigDecimal.ZERO;
        }
        BigDecimal commission = netCollected.multiply(rate).setScale(2, java.math.RoundingMode.HALF_UP);
        BigDecimal providerNet = netCollected.subtract(commission).add(adjustment);

        this.commissionAmount = commission;
        this.providerNetAmount = providerNet;
    }

    /** Chuyển sang ELIGIBLE — ghi nhận thời điểm đáp ứng điều kiện lần đầu. */
    public void markEligible() {
        if (this.status == ProviderRevenueStatus.SETTLED) {
            return; // Không hồi sinh khoản đã tất toán.
        }
        this.status = ProviderRevenueStatus.ELIGIBLE;
        this.deferredReason = null;
        if (this.eligibleAt == null) {
            this.eligibleAt = Instant.now();
        }
    }

    /** Chuyển sang PENDING kèm lý do chưa đủ điều kiện. */
    public void markPending(DeferredReason reason) {
        if (this.status == ProviderRevenueStatus.SETTLED) {
            return;
        }
        this.status = ProviderRevenueStatus.PENDING;
        this.deferredReason = reason;
    }

    /** Được chọn vào một Settlement đang chờ xử lý. */
    public void markInSettlement(Long settlementId) {
        this.status = ProviderRevenueStatus.IN_SETTLEMENT;
        this.settlementId = settlementId;
    }

    /** Settlement được duyệt — chuyển sang SETTLED. */
    public void markSettled() {
        this.status = ProviderRevenueStatus.SETTLED;
        this.settledAt = Instant.now();
    }

    /** Giải phóng khỏi Settlement (bị từ chối / hủy trước khi duyệt). */
    public void releaseFromSettlement() {
        this.settlementId = null;
        this.status = ProviderRevenueStatus.ELIGIBLE;
    }

    /** Tạo kỳ doanh thu từ ngày hoàn thành trải nghiệm. */
    public static String periodOf(LocalDate completedDate) {
        YearMonth ym = YearMonth.of(completedDate.getYear(), completedDate.getMonth());
        return String.format("%04d-%02d", ym.getYear(), ym.getMonthValue());
    }
}
