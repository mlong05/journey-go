package com.journeygo.modules.aiguide.dto;

import com.journeygo.modules.aiguide.entity.AiDocumentScope;
import com.journeygo.modules.aiguide.entity.AiDocumentType;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Request cập nhật thông tin & nội dung tài liệu Context / Rule.
 */
public record AiKnowledgeDocumentUpdateRequest(
        @NotBlank(message = "Tiêu đề không được để trống")
        @Size(max = 200, message = "Tiêu đề tối đa 200 ký tự")
        String title,

        @NotNull(message = "Phân loại tài liệu không được để trống")
        AiDocumentType docType,

        @NotNull(message = "Phạm vi áp dụng không được để trống")
        AiDocumentScope scope,

        Long destinationId,

        @NotBlank(message = "Nội dung văn bản không được để trống")
        String rawText,

        Boolean active
) {
}
