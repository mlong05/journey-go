package com.journeygo.modules.wallet.entity;

import com.journeygo.modules.providerprofile.entity.ProviderProfile;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Wallet — ví nội bộ của ProviderProfile.
 *
 * <p>Quy tắc nghiệp vụ:
 * <ul>
 *   <li>Một ProviderProfile chỉ có đúng một Wallet — ràng buộc duy nhất trên {@code provider_profile_id}.</li>
 *   <li>Số dư khởi tạo bằng 0.</li>
 *   <li>Số dư chỉ thay đổi qua giao dịch Wallet tương ứng — không sửa trực tiếp số dư.</li>
 *   <li>Số dư phản ánh quyền lợi tài chính đã được ghi nhận, KHÔNG đồng nghĩa tiền đã chuyển
 *       vào tài khoản ngân hàng (rút tiền nằm ngoài phạm vi hiện tại).</li>
 * </ul>
 */
@Entity
@Table(name = "wallets", uniqueConstraints = {
        @UniqueConstraint(name = "uk_wallet_provider_profile", columnNames = {"provider_profile_id"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Wallet {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "provider_profile_id", nullable = false, unique = true)
    private ProviderProfile providerProfile;

    /** Số dư đã được tất toán (VND). */
    @Column(name = "balance", nullable = false, precision = 16, scale = 2)
    @Builder.Default
    private BigDecimal balance = BigDecimal.ZERO;

    @Column(name = "currency", nullable = false, length = 3)
    @Builder.Default
    private String currency = "VND";

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        if (this.balance == null) {
            this.balance = BigDecimal.ZERO;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
