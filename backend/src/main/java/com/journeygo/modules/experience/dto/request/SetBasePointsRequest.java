package com.journeygo.modules.experience.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Đặt điểm thưởng mỗi nhiệm vụ của một loại nhiệm vụ (giữ nguyên hệ số nhân / điều kiện bonus)")
public record SetBasePointsRequest(
        @Schema(description = "Điểm thưởng", example = "20")
        @NotNull(message = "Vui lòng nhập điểm thưởng")
        @Min(value = 1, message = "Điểm thưởng phải lớn hơn 0")
        @Max(value = 10000, message = "Điểm thưởng tối đa 10000")
        Integer basePoints
) {}
