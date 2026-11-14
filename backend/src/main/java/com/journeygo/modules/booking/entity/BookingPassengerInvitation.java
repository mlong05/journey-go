package com.journeygo.modules.booking.entity;

import com.journeygo.modules.booking.entity.enums.InvitationStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Lời mời tham gia tour (Tour Invitation).
 *
 * <p>Quy trình: người đặt (Booking Customer) chọn hành khách có email → backend tạo token →
 * gửi email kèm liên kết → người nhận đăng nhập/đăng ký rồi xác nhận → Passenger được
 * liên kết với User.
 *
 * <p>⚠️ Token KHÔNG lưu bản rõ — chỉ lưu SHA-256 hash ({@link #invitationTokenHash}).
 * Hạn 24 giờ kể từ lúc tạo.
 */
@Entity
@Table(name = "booking_passenger_invitations",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_booking_passenger_invitation_hash", columnNames = "invitation_token_hash"),
        indexes = {
                @Index(name = "idx_booking_passenger_invitations_booking", columnList = "booking_id, created_at DESC"),
                @Index(name = "idx_booking_passenger_invitations_passenger", columnList = "booking_passenger_id, created_at DESC"),
                @Index(name = "idx_booking_passenger_invitations_status", columnList = "status, expires_at")
            })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class BookingPassengerInvitation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_passenger_id", nullable = false)
    private BookingPassenger passenger;

    /** Người gửi lời mời (thường là Booking Customer). */
    @Column(name = "invited_by", nullable = false)
    private Long invitedBy;

    @Column(name = "invited_email", nullable = false, length = 255)
    private String invitedEmail;

    /** SHA-256 hash của token thô. */
    @Column(name = "invitation_token_hash", nullable = false, length = 64, unique = true)
    private String invitationTokenHash;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private InvitationStatus status = InvitationStatus.PENDING;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "accepted_at")
    private Instant acceptedAt;

    @Column(name = "accepted_user_id")
    private Long acceptedUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        if (this.status == null) {
            this.status = InvitationStatus.PENDING;
        }
    }

    /** Lời mời còn dùng được (chưa hết hạn, chưa dùng, chưa bị thu hồi). */
    public boolean isUsable(Instant now) {
        return status == InvitationStatus.PENDING && expiresAt != null && expiresAt.isAfter(now);
    }

    /** Đánh dấu hết hạn (idempotent). */
    public void markExpired() {
        if (status == InvitationStatus.PENDING) {
            status = InvitationStatus.EXPIRED;
        }
    }

    /** Đánh dấu đã được dùng (idempotent). */
    public void accept(Long userId, Instant now) {
        this.status = InvitationStatus.ACCEPTED;
        this.acceptedAt = now;
        this.acceptedUserId = userId;
    }

    /** Thu hồi lời mời (booking bị hủy). */
    public void revoke() {
        if (status == InvitationStatus.PENDING) {
            status = InvitationStatus.REVOKED;
        }
    }
}
