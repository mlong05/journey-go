package com.journeygo.modules.aiguide.dto;

import com.journeygo.modules.aiguide.entity.AiDocumentScope;
import com.journeygo.modules.aiguide.entity.AiDocumentType;
import com.journeygo.modules.aiguide.entity.AiKnowledgeDocument;

import java.time.Instant;

/**
 * DTO thông tin tài liệu Context / Rule cho màn hình Admin AI RAG.
 */
public record AiKnowledgeDocumentDto(
        Long id,
        String title,
        AiDocumentType docType,
        AiDocumentScope scope,
        Long destinationId,
        String destinationName,
        String fileName,
        String fileType,
        long fileSize,
        String fileUrl,
        String rawText,
        String rawTextPreview,
        boolean active,
        int chunkCount,
        Long uploadedBy,
        Instant createdAt,
        Instant updatedAt
) {
    private static final int PREVIEW_MAX_CHARS = 240;

    public static AiKnowledgeDocumentDto from(AiKnowledgeDocument doc, String destinationName, boolean includeFullText) {
        String text = doc.getRawText() != null ? doc.getRawText() : "";
        String preview = text.length() <= PREVIEW_MAX_CHARS
                ? text
                : text.substring(0, PREVIEW_MAX_CHARS) + "...";

        return new AiKnowledgeDocumentDto(
                doc.getId(),
                doc.getTitle(),
                doc.getDocType(),
                doc.getScope(),
                doc.getDestinationId(),
                destinationName,
                doc.getFileName(),
                doc.getFileType(),
                doc.getFileSize(),
                doc.getFileUrl(),
                includeFullText ? text : null,
                preview,
                doc.isActive(),
                doc.getChunkCount(),
                doc.getUploadedBy(),
                doc.getCreatedAt(),
                doc.getUpdatedAt()
        );
    }
}
