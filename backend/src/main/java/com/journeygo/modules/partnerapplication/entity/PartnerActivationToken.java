package com.journeygo.modules.partnerapplication.entity;

import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Token thiết lập mật khẩu lần đầu cho tài khoản đối tác được Admin duyệt.
 *
 * <p>Đặc tả yêu cầu: "Backend nên tạo activation token, gửi link để đối tác thiết lập mật khẩu."
 * Token hết hạn sau 72 giờ và chỉ dùng được một lần.
 */
@Entity
@Table(name = "partner_activation_tokens", indexes = {
        @Index(name = "idx_partner_activation_token", columnList = "token"),
        @Index(name = "idx_partner_activation_user", columnList = "user_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PartnerActivationToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 120, unique = true)
    private String token;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "application_id")
    private Long applicationId;

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
