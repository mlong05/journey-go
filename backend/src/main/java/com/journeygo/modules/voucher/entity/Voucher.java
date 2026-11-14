package com.journeygo.modules.voucher.entity;

import com.journeygo.modules.providerprofile.entity.ProviderProfile;
import com.journeygo.modules.voucher.entity.enums.DiscountType;
import com.journeygo.modules.voucher.entity.enums.VoucherScope;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Voucher Entity: Định nghĩa chương trình khuyến mãi/giảm giá của Nền tảng hoặc Đối tác.
 */
@Entity
@Table(name = "vouchers", indexes = {
        @Index(name = "idx_vouchers_code", columnList = "code", unique = true),
        @Index(name = "idx_vouchers_active", columnList = "is_active"),
        @Index(name = "idx_vouchers_scope", columnList = "voucher_scope"),
        @Index(name = "idx_vouchers_partner", columnList = "partner_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Voucher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, unique = true, length = 50)
    private String code;

    @Column(name = "title", nullable = false, length = 150)
    private String title;

    @Column(name = "description", length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "voucher_scope", nullable = false, length = 20)
    @Builder.Default
    private VoucherScope voucherScope = VoucherScope.PLATFORM;

    /**
     * Đối tác sở hữu nếu voucherScope = PARTNER.
     * Null nếu voucherScope = PLATFORM (toàn sàn).
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "partner_id")
    private ProviderProfile partner;

    @Enumerated(EnumType.STRING)
    @Column(name = "discount_type", nullable = false, length = 20)
    @Builder.Default
    private DiscountType discountType = DiscountType.FIXED_AMOUNT;

    @Column(name = "discount_value", nullable = false, precision = 12, scale = 2)
    private BigDecimal discountValue;

    @Column(name = "min_order_amount", precision = 12, scale = 2)
    private BigDecimal minOrderAmount;

    @Column(name = "max_discount_amount", precision = 12, scale = 2)
    private BigDecimal maxDiscountAmount;

    @Column(name = "points_required", nullable = false)
    @Builder.Default
    private Integer pointsRequired = 0;

    @Column(name = "total_quantity", nullable = false)
    @Builder.Default
    private Integer totalQuantity = 0;

    @Column(name = "remaining_quantity", nullable = false)
    @Builder.Default
    private Integer remainingQuantity = 0;

    @Column(name = "valid_days", nullable = false)
    @Builder.Default
    private Integer validDays = 30;

    @Column(name = "start_date")
    private Instant startDate;

    @Column(name = "end_date")
    private Instant endDate;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
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
