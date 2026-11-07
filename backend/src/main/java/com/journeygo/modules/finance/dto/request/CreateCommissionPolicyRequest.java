package com.journeygo.modules.finance.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.time.Instant;

public record CreateCommissionPolicyRequest(
        @Schema(description = "Tên chính sách", example = "Policy 02")
        @NotBlank(message = "Tên chính sách không được để trống")
        @Size(max = 150, message = "Tên chính sách không được vượt quá 150 ký tự")
        String name,

        @Schema(description = "Tỷ lệ hoa hồng (0.30 = 30%)", example = "0.30")
        @NotNull(message = "Tỷ lệ hoa hồng không được để trống")
        @DecimalMin(value = "0.0", inclusive = false, message = "Tỷ lệ hoa hồng phải lớn hơn 0%")
        @DecimalMax(value = "1.0", inclusive = false, message = "Tỷ lệ hoa hồng phải nhỏ hơn 100%")
        BigDecimal commissionRate,

        @Schema(description = "Ngày bắt đầu có hiệu lực")
        @NotNull(message = "Ngày bắt đầu hiệu lực không được để trống")
        Instant effectiveFrom,

        @Schema(description = "Ngày kết thúc hiệu lực (khuyến nghị để trống = không xác định)")
        Instant effectiveTo,

        @Schema(description = "Lý do thay đổi (bắt buộc — BR-06)")
        @NotBlank(message = "Lý do thay đổi không được để trống")
        @Size(max = 1000, message = "Lý do thay đổi không được vượt quá 1000 ký tự")
        String changeReason
) {
}
