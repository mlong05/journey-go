package com.journeygo.modules.aiguide.dto;

import com.journeygo.modules.aiguide.entity.AiKnowledgeChunk;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;
import java.util.Map;
import java.util.UUID;

/**
 * DTO phục vụ màn hình quản trị kiểm tra nội dung các đoạn tri thức trong Vector Store
 * (không kèm mảng 768 float để tối ưu payload).
 */
@Schema(description = "Thông tin đoạn tri thức trong Vector Store cho Admin")
public record AiKnowledgeChunkAdminDto(
        UUID id,
        String sourceId,
        Long destinationId,
        String contentType,
        String chunkText,
        Map<String, Object> metadata,
        Instant updatedAt
) {
    public static AiKnowledgeChunkAdminDto from(AiKnowledgeChunk entity) {
        return new AiKnowledgeChunkAdminDto(
                entity.getId(),
                entity.getSourceId(),
                entity.getDestinationId(),
                entity.getContentType(),
                entity.getChunkText(),
                entity.getMetadata(),
                entity.getUpdatedAt()
        );
    }
}
