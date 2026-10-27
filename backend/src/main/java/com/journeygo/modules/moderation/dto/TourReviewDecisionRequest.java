package com.journeygo.modules.moderation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

public record TourReviewDecisionRequest(
        @Schema(description = "Ghi chú kèm quyết định", example = "Vui lòng xác minh lại lịch trình")
        @Size(max = 1000) String note,
        @Schema(description = "Mã lý do từ chối dạng checkbox, phân cách bằng dấu phẩy; bắt buộc khi từ chối",
                example = "INCOMPLETE_INFORMATION,OTHER")
        @Size(max = 500) String reason,
        @Schema(description = "Nội dung lý do khác; bắt buộc nếu reason có mã OTHER")
        @Size(max = 500) String otherReason
) {}
