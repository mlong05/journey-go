package com.journeygo.modules.providerchat.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Cuộc trò chuyện trực tiếp giữa du khách (tourist) và nhà tour (Content Provider).
 *
 * <p>Khác với {@link com.journeygo.modules.booking.entity.BookingMessage} (chat gắn với
 * một Booking), cuộc trò chuyện ở đây KHÔNG cần đã mua tour — du khách có thể nhắn
 * cho nhà tour ngay khi đang xem chi tiết tour.
 *
 * <p>Khoá duy nhất {@code (tourist_id, provider_id)} ⇒ mỗi cặp khách–nhà tour chỉ có
 * MỘT cuộc trò chuyện ⇒ lịch sử chat được gom lại theo từng nhà tour (mục
 * "Hỗ trợ từ nhà tour" trong phần Tài khoản).
 */
@Entity
@Table(name = "provider_conversations",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_provider_conversation_pair", columnNames = {"tourist_id", "provider_id"}),
        indexes = {
                @Index(name = "idx_provider_conversations_tourist", columnList = "tourist_id, updated_at DESC"),
                @Index(name = "idx_provider_conversations_provider", columnList = "provider_id, updated_at DESC")
        })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProviderConversation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Du khách mở cuộc trò chuyện. */
    @Column(name = "tourist_id", nullable = false)
    private Long touristId;

    /** Nhà tour (Content Provider) — user_id trong `users`. */
    @Column(name = "provider_id", nullable = false)
    private Long providerId;

    /** Tour mà du khách đang hỏi (có thể NULL). */
    @Column(name = "tour_id")
    private Long tourId;

    /** Tiêu đề rút gọn (VD: tên tour). */
    @Column(name = "subject", length = 255)
    private String subject;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    /** Thời điểm tin nhắn cuối cùng — dùng để sắp xếp danh sách hội thoại. */
    @Column(name = "last_message_at")
    private Instant lastMessageAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
