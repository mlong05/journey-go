package com.journeygo.modules.providerchat.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Tin nhắn trong cuộc trò chuyện trực tiếp giữa du khách và nhà tour.
 *
 * <p>Dùng cho chat TRƯỚC khi mua tour (du khách hỏi lịch trình, giá, thời gian...).
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
