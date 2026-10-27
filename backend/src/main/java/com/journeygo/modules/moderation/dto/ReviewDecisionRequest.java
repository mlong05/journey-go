package com.journeygo.modules.moderation.dto;

import jakarta.validation.constraints.Size;
import io.swagger.v3.oas.annotations.media.Schema;

public record ReviewDecisionRequest(
        @Schema(description = "Ghi chú bổ sung cho quyết định kiểm duyệt", example = "Vui lòng thay ảnh rõ hơn")
        @Size(max = 1000) String note,
        @Schema(description = "Các mã lý do từ chối được chọn, phân cách bằng dấu phẩy; bắt buộc khi từ chối. Bỏ trống khi duyệt.",
                example = "IMAGE_NOT_RELEVANT,INACCURATE_INFORMATION")
        @Size(max = 500) String reason,
        @Schema(description = "Nội dung lý do khác; bắt buộc nếu reason có mã OTHER")
        @Size(max = 500) String otherReason
) {}
