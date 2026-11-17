package com.journeygo.modules.aiguide.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.UUID;

/**
 * Lưu các lượt trao đổi trong phiên hội thoại (User / Assistant) để làm Memory ngữ cảnh.
 */
@Entity
@Table(name = "ai_chat_messages", indexes = {
        @Index(name = "idx_ai_chat_messages_session", columnList = "session_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "session_id", nullable = false)
    private UUID sessionId;

    /**
     * Vai trò của tin nhắn: 'USER' hoặc 'ASSISTANT' (hoặc 'SYSTEM').
     */
    @Column(name = "role", nullable = false, length = 20)
    private String role;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    public void prePersist() {
        if (this.createdAt == null) {
            this.createdAt = Instant.now();
        }
    }
}
