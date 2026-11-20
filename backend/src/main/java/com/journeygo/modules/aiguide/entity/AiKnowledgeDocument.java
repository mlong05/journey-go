package com.journeygo.modules.aiguide.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Thực thể quản lý các tệp Context và Rule do Admin / Moderator nạp cho AI Virtual Guide.
 */
@Entity
@Table(name = "ai_knowledge_documents", indexes = {
        @Index(name = "idx_ai_docs_type_active", columnList = "doc_type, active"),
        @Index(name = "idx_ai_docs_scope_dest", columnList = "scope, destination_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiKnowledgeDocument {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(name = "doc_type", nullable = false, length = 40)
    private AiDocumentType docType;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private AiDocumentScope scope = AiDocumentScope.GLOBAL;

    @Column(name = "destination_id")
    private Long destinationId;

    @Column(name = "file_name", length = 255)
    private String fileName;

    @Column(name = "file_type", length = 30)
    private String fileType;

    @Column(name = "file_size", nullable = false)
    @Builder.Default
    private long fileSize = 0L;

    @Column(name = "file_url", length = 1000)
    private String fileUrl;

    @Column(name = "file_public_id", length = 255)
    private String filePublicId;

    @Column(name = "raw_text", nullable = false, columnDefinition = "TEXT")
    private String rawText;

    @Column(nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "chunk_count", nullable = false)
    @Builder.Default
    private int chunkCount = 0;

    @Column(name = "uploaded_by")
    private Long uploadedBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
