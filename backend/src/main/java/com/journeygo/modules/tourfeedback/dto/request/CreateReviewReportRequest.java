package com.journeygo.modules.tourfeedback.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record CreateReviewReportRequest(
        @NotBlank(message = "Vui lòng cho biết lý do báo cáo")
        @Size(max = 1000, message = "Lý do tối đa 1000 ký tự")
        @Schema(description = "Lý do báo cáo đánh giá vi phạm (spam, xúc phạm, quảng cáo…)")
        String reason
) {
}
