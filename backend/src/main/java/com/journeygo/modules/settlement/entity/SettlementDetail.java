package com.journeygo.modules.settlement.entity;

import com.journeygo.modules.providerprofile.entity.ProviderProfile;
import com.journeygo.modules.providerrevenue.entity.ProviderRevenue;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Settlement Detail — liên kết Settlement với từng khoản ProviderProfile Revenue được chọn.
 *
 * <p>Giữ lại snapshot số tiền tại thời điểm chọn vào Settlement để Admin có thể xem chi tiết
 * từng Booking / Payment / Refund và cách tính số tiền — không chỉ lưu tổng tiền.
 */
@Entity
@Table(name = "settlement_details", uniqueConstraints = {
        @UniqueConstraint(name = "uk_settlement_detail_provider_revenue", columnNames = {"settlement_id", "provider_revenue_id"})
}, indexes = {
        @Index(name = "idx_settlement_detail_settlement", columnList = "settlement_id"),
        @Index(name = "idx_settlement_detail_provider_revenue", columnList = "provider_revenue_id"),
        @Index(name = "idx_settlement_detail_provider_profile", columnList = "provider_profile_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SettlementDetail {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "settlement_id", nullable = false)
    private Settlement settlement;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "provider_revenue_id", nullable = false)
    private ProviderRevenue providerRevenue;

    /**
     * Đối tác sở hữu khoản doanh thu này.
     *
     * <p>Với đợt TỔNG ({@code scope = BATCH}) thì {@code Settlement.providerProfile} là NULL
     * ⇒ cần cột này để biết khoản doanh thu thuộc đối tác nào (để cộng tiền vào đúng ví
     * khi duyệt, và để hiển thị trong danh sách chi tiết).
     *
     * <p>Với đợt của MỘT đối tác thì cột này trùng với {@code Settlement.providerProfile}.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "provider_profile_id", nullable = false)
    private ProviderProfile providerProfile;

    /**
     * Kỳ doanh thu gốc của khoản doanh thu (chu kỳ 10 ngày, {@code yyyy-MM-D}) —
     * có thể khác kỳ của Settlement (khoản doanh thu chuyển tiếp).
     */
    @Column(name = "revenue_period", nullable = false, length = 10)
    private String revenuePeriod;

    @Column(name = "gross_amount", nullable = false, precision = 14, scale = 2)
    private BigDecimal grossAmount;

    @Column(name = "refund_amount", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal refundAmount = BigDecimal.ZERO;

    @Column(name = "commission_amount", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal commissionAmount = BigDecimal.ZERO;

    @Column(name = "adjustment_amount", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal adjustmentAmount = BigDecimal.ZERO;

    @Column(name = "provider_net_amount", nullable = false, precision = 14, scale = 2)
    @Builder.Default
    private BigDecimal providerNetAmount = BigDecimal.ZERO;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}
