package com.journeygo.modules.partnerapplication.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * OTP xác minh email khi đăng ký trở thành đối tác.
 *
 * <p>Quy tắc (đặc tả Final1_DOITAC.pdf — Giai đoạn 1):
 * <ul>
 *   <li>Mã 6 chữ số, hạn 5 phút.</li>
 *   <li>Tối đa 3 lần gửi cho cùng email trong 1 ngày.</li>
 *   <li>Tối đa 5 lần nhập sai.</li>
 *   <li>Gửi mã mới ⇒ mã cũ mất hiệu lực (đánh dấu {@code used = true}).</li>
 * </ul>
 */
@Entity
@Table(name = "partner_application_otps", indexes = {
        @Index(name = "idx_partner_app_otps_email", columnList = "email, created_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PartnerApplicationOtp {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String email;

    @Column(nullable = false, length = 10)
    private String otp;

    @Column(name = "expiry_date", nullable = false)
    private Instant expiryDate;

    @Column(nullable = false)
    @Builder.Default
    private boolean used = false;

    /** Số lần đã nhập sai mã này. */
    @Column(name = "attempt_count", nullable = false)
    @Builder.Default
    private int attemptCount = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }

    public boolean isExpired() {
        return Instant.now().isAfter(expiryDate);
    }
}
