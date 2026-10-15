package com.journeygo.modules.experience.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

@Schema(description = "Yêu cầu cập nhật Experience (chỉ DRAFT — BR-EXP-2)")
public record UpdateExperienceRequest(

        @Schema(description = "Tiêu đề mới")
        @Size(max = 255)
        String title,

        @Schema(description = "Mô tả mới")
        String description,

        @Schema(description = "Giá mới")
        @DecimalMin(value = "0.0")
        BigDecimal price,

        @Schema(description = "Currency mới")
        @Size(min = 3, max = 3)
        String currency,

        @Schema(description = "Duration mới (phút)")
        @Min(1)
        Integer durationMinutes
) {}
