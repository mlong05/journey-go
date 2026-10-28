package com.journeygo.modules.partner.entity;

import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Partner — đối tác cung cấp dịch vụ, đối tượng hưởng doanh thu và sở hữu Wallet.
 *
 * <p>Quy tắc: một User có vai trò PARTNER sẽ có đúng một bản ghi Partner và đúng một Wallet.
 * Việc tạo Partner + Wallet phải nằm trong cùng một transaction.
 */
@Entity
@Table(name = "partners", indexes = {
        @Index(name = "idx_partners_user", columnList = "user_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Partner {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    /** Tên hiển thị của đối tác. */
    @Column(name = "partner_name", nullable = false, length = 150)
    private String partnerName;

    /** Tỷ lệ hoa hồng nền tảng áp dụng (ví dụ 0.20 = 20%). */
    @Column(name = "commission_rate", nullable = false, precision = 5, scale = 4)
    @Builder.Default
    private BigDecimal commissionRate = new BigDecimal("0.2000");

    /** Tỷ lệ hoa hồng riêng cho từng Destination (nếu có) — bảng chi tiết riêng. */
    @Column(name = "destination_commission_override", columnDefinition = "TEXT")
    private String destinationCommissionOverride;

    @Column(name = "active", nullable = false)
    @Builder.Default
    private boolean active = true;

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

    /** Tỷ lệ hoa hồng áp dụng cho đối tác. */
    public BigDecimal getEffectiveCommissionRate() {
        return commissionRate != null ? commissionRate : BigDecimal.ZERO;
    }
}
