package com.journeygo.modules.aiguide.entity;

import io.hypersistence.utils.hibernate.type.json.JsonBinaryType;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.Type;
import org.hibernate.type.SqlTypes;

import java.time.Instant;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

/**
 * Entity lưu trữ các đoạn tri thức văn hóa, lịch sử và điểm tham quan kèm vector nhúng 768 chiều.
 */
@Entity
@Table(name = "ai_knowledge_chunks", indexes = {
        @Index(name = "idx_ai_chunks_destination", columnList = "destination_id"),
        @Index(name = "idx_ai_chunks_source", columnList = "source_id"),
        @Index(name = "idx_ai_chunks_content_type", columnList = "content_type")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AiKnowledgeChunk {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    /**
     * Định danh nguồn gốc dữ liệu (Ví dụ: "CULTURAL_CONTENT:15", "DESTINATION:4").
     */
    @Column(name = "source_id", nullable = false, length = 100)
    private String sourceId;

    /**
     * ID địa điểm (khớp với Destination.id).
     */
    @Column(name = "destination_id", nullable = false)
    private Long destinationId;

    /**
     * Phân loại nội dung: 'CULTURAL_STORY', 'TOUR_INFO', 'TASK_HINT', v.v.
     */
    @Column(name = "content_type", nullable = false, length = 50)
    private String contentType;

    /**
     * Nội dung đoạn văn bản đã được gắn Context Prefix.
     */
    @Column(name = "chunk_text", nullable = false, columnDefinition = "TEXT")
    private String chunkText;

    /**
     * Metadata bổ trợ dạng JSONB (tiêu đề, tên địa điểm, tọa độ...).
     */
    @Type(JsonBinaryType.class)
    @Column(name = "metadata", columnDefinition = "jsonb")
    @Builder.Default
    private Map<String, Object> metadata = new HashMap<>();

    /**
     * Vector nhúng 768 chiều (tạo bởi Gemini text-embedding-004).
     */
    @Convert(converter = PGvectorConverter.class)
    //@JdbcTypeCode(SqlTypes.OTHER)
    @Column(name = "embedding", nullable = false, columnDefinition = "vector")
    private float[] embedding;

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

