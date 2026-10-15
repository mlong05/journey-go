package com.journeygo.modules.experience.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.Map;

@Schema(description = "Tạo/cập nhật PointRule cho TaskType")
public record SetPointRuleRequest(

        @Schema(description = "Điểm nền tảng")
        @NotNull
        @Min(0)
        Integer basePoints,

        @Schema(description = "Hệ số nhân thưởng (vd: 1.5 = +50%)")
        @NotNull
        @DecimalMin(value = "0.00", message = "Multiplier phải >= 0")
        @DecimalMax(value = "9.99", message = "Multiplier phải <= 9.99")
        BigDecimal bonusMultiplier,

        @Schema(description = "Điều kiện bonus linh hoạt (JSONB) — vd: {firstAttempt:1.5, perfectScore:1.2}")
        Map<String, Object> conditions
) {}
