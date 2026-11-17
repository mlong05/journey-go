package com.journeygo.modules.gamification.entity;

import com.journeygo.modules.gamification.entity.enums.UserVoucherStatus;
import com.journeygo.modules.voucher.entity.Voucher;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "user_vouchers", indexes = {
        @Index(name = "idx_user_vouchers_user_id", columnList = "user_id"),
        @Index(name = "idx_user_vouchers_voucher_id", columnList = "voucher_id"),
        @Index(name = "idx_user_vouchers_code", columnList = "user_voucher_code", unique = true),
        @Index(name = "idx_user_vouchers_status", columnList = "status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserVoucher {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "voucher_id", nullable = false)
    private Voucher voucher;

    @Column(name = "user_voucher_code", nullable = false, unique = true, length = 100)
    private String userVoucherCode;

    @Column(name = "points_spent", nullable = false)
    private Integer pointsSpent;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private UserVoucherStatus status = UserVoucherStatus.AVAILABLE;

    @Column(name = "redeemed_at", nullable = false, updatable = false)
    private Instant redeemedAt;

    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "used_order_reference", length = 100)
    private String usedOrderReference;

    @PrePersist
    protected void onCreate() {
        this.redeemedAt = Instant.now();
    }
}
