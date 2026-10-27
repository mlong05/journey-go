package com.journeygo.modules.moderation.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Size;

public record DestinationReviewDecisionRequest(
        @Schema(description = "Ghi chú kèm quyết định", example = "Vui lòng xác minh lại địa chỉ")
        @Size(max = 1000) String note,
        @Schema(description = "Mã lý do từ chối được chọn, phân cách bằng dấu phẩy; bắt buộc khi từ chối",
                example = "INACCURATE_INFORMATION,OTHER")
        @Size(max = 500) String reason,
        @Schema(description = "Nội dung lý do khác; bắt buộc nếu reason có mã OTHER",
                example = "Địa chỉ không khớp với bản đồ")
        @Size(max = 500) String otherReason
) {}
