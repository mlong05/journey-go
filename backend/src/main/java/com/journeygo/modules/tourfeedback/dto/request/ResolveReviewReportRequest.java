package com.journeygo.modules.tourfeedback.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResolveReviewReportRequest(
        @NotBlank(message = "Kết quả xử lý không được để trống")
        @Size(max = 500, message = "Kết quả xử lý tối đa 500 ký tự")
        @Schema(description = "Mô tả kết quả xử lý báo cáo")
        String resolution
) {
}
