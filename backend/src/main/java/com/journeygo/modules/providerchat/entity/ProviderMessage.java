package com.journeygo.modules.providerchat.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Tin nhắn trong cuộc trò chuyện trực tiếp giữa du khách và nhà tour.
 *
 * <p>Dùng cho chat TRƯỚC khi mua tour (du khách hỏi lịch trình, giá, thời gian...)
 * và SAU khi mua tour (khung "Hỗ trợ trong đơn này") — về bản chất là MỘT kênh
 * liên lạc duy nhất giữa du khách và nhà tour.
 */
@Entity
@Table(name = "provider_messages",
        indexes = @Index(name = "idx_provider_messages_conversation", columnList = "conversation_id, created_at"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProviderMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "conversation_id", nullable = false)
    private ProviderConversation conversation;

    /** Người gửi (du khách hoặc nhà tour). */
    @Column(name = "sender_id", nullable = false)
    private Long senderId;

    @Column(name = "body", nullable = false, columnDefinition = "TEXT")
    private String body;

    /** Tour mà tin nhắn này hỏi về (NULL với tin nhắn cũ trước V26). */
    @Column(name = "tour_id")
    private Long tourId;

    /**
     * Đơn đặt tour mà tin nhắn này gắn với (nếu có).
     *
     * <p>NULL = tin nhắn hỏi trước khi đặt tour (mở từ trang chi tiết tour).
     * Không NULL = tin nhắn gửi trong khung "Hỗ trợ trong đơn này".
     */
    @Column(name = "booking_id")
    private Long bookingId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "read_at")
    private Instant readAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }

    public boolean isRead() {
        return readAt != null;
    }
}