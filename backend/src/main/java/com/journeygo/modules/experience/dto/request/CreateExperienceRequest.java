package com.journeygo.modules.experience.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

@Schema(description = "Yêu cầu tạo Experience mới (không có experienceType — dùng Task)")
public record CreateExperienceRequest(

        @Schema(description = "ID Destination (1-1 với Experience — BR-EXP-1)", example = "1")
        @NotNull(message = "Destination ID không được để trống")
        Long destinationId,

        @Schema(description = "Tiêu đề Experience", example = "Khám phá Tràng An bằng Quiz")
        @NotBlank(message = "Tiêu đề không được để trống")
        @Size(max = 255, message = "Tiêu đề tối đa 255 ký tự")
        String title,

        @Schema(description = "Mô tả chi tiết")
        String description,

        @Schema(description = "Giá (VND/USD...)", example = "50000.00")
        @NotNull(message = "Giá không được để trống")
        @DecimalMin(value = "0.0", message = "Giá phải >= 0")
        BigDecimal price,

        @Schema(description = "Đơn vị tiền tệ (ISO 4217)", example = "VND")
        @NotBlank(message = "Currency không được để trống")
        @Size(min = 3, max = 3, message = "Currency phải đúng 3 ký tự (ISO 4217)")
        @Pattern(regexp = "^[A-Z]{3}$", message = "Currency phải là 3 chữ cái in hoa (ISO 4217)")
        String currency,

        @Schema(description = "Thời lượng ước tính (phút)", example = "120")
        @Min(value = 1, message = "Duration phải >= 1 phút")
        Integer durationMinutes
) {}
