package com.journeygo.modules.reward.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Admin cập nhật mức điểm thưởng")
public record UpdateRewardSettingRequest(
        @Schema(description = "Số điểm (lớn hơn 0)", example = "10")
        @NotNull(message = "Số điểm không được để trống")
        @Min(value = 1, message = "Số điểm phải lớn hơn 0")
        @Max(value = 10000, message = "Số điểm tối đa 10000")
        Integer points
) {}
