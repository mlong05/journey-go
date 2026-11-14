package com.journeygo.modules.gamification.entity;

import com.journeygo.modules.gamification.entity.enums.UserVoucherStatus;
import com.journeygo.modules.voucher.entity.Voucher;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Entity
@Table(name = "user_vouchers", indexes = {
        @Index(name = "idx_user_vouchers_user", columnList = "user_id"),
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

    @ManyToOne(fetch = FetchType.LAZY)
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

    // Đã chuyển từ Instant sang LocalDate
    @Column(name = "expiry_date", nullable = false)
    private LocalDate expiryDate;

    @Column(name = "used_at")
    private LocalDateTime usedAt; // Thời điểm sử dụng voucher (lưu chi tiết giờ phút nên dùng LocalDateTime)

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}