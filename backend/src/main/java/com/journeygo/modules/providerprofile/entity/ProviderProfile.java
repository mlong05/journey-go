package com.journeygo.modules.providerprofile.entity;

import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * ProviderProfile — đối tác cung cấp dịch vụ, đối tượng hưởng doanh thu và sở hữu Wallet.
 *
 * <p>Quy tắc: một User có vai trò CONTENT_PROVIDER sẽ có đúng một bản ghi ProviderProfile và đúng một Wallet.
 * Việc tạo ProviderProfile + Wallet phải nằm trong cùng một transaction.
 */
@Entity
@Table(name = "provider_profiles", indexes = {
        @Index(name = "idx_provider_profiles_user", columnList = "user_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProviderProfile {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    /** Tên hiển thị của đối tác. */
    @Column(name = "provider_name", nullable = false, length = 150)
    private String providerName;

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

    /**
     * Đối tác được tạo / gửi duyệt tour (BR-01).
     * Hồ sơ chỉ được tạo SAU KHI Admin duyệt đơn đăng ký đối tác (/partner-register → /admin/partners),
     * nên chỉ cần kiểm tra đối tác còn đang hoạt động.
     */
    public boolean canManageTours() {
        return active;
    }
}
