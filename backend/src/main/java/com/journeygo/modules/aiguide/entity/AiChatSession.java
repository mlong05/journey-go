package com.journeygo.modules.aiguide.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Quản lý phiên hội thoại giữa du khách và AI Virtual Guide.
 */
@Entity
@Table(name = "ai_chat_sessions", indexes = {
        @Index(name = "idx_ai_chat_sessions_user", columnList = "user_id"),
        @Index(name = "idx_ai_chat_sessions_destination", columnList = "current_destination_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatSession {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * ID du khách sở hữu phiên chat (khớp User.id).
     */
    @Column(name = "user_id", nullable = false)
    private Long userId;

    /**
     * Điểm đến du khách đang đứng / quét QR (khớp Destination.id).
     */
    @Column(name = "current_destination_id")
    private Long currentDestinationId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    public void prePersist() {
        Instant now = Instant.now();
        if (this.createdAt == null) {
            this.createdAt = now;
        }
        if (this.updatedAt == null) {
            this.updatedAt = now;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = Instant.now();
    }
}
