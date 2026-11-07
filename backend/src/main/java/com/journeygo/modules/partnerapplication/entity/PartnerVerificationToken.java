package com.journeygo.modules.partnerapplication.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Token xác nhận "email này đã được verify OTP".
 *
 * <p>Sinh ra ngay sau khi {@code verifyOtp} thành công. Bắt buộc kèm theo mọi lệnh
 * lưu nháp / gửi đơn — nhờ vậy không ai giả mạo được trạng thái "đã xác minh" của một email
 * mà mình không thực sự nhận được OTP.
 *
 * <p>Hết hạn sau 24 giờ.
 */
@Entity
@Table(name = "partner_verification_tokens", indexes = {
        @Index(name = "idx_partner_verification_token", columnList = "token"),
        @Index(name = "idx_partner_verification_email", columnList = "email")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PartnerVerificationToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120, unique = true)
    private String token;

    @Column(nullable = false, length = 100)
    private String email;

    @Column(nullable = false)
    @Builder.Default
    private boolean used = false;

    @Column(name = "expiry_date", nullable = false)
    private Instant expiryDate;

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
