package com.journeygo.modules.experience.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

/**
 * Set lại points_reward (CP chỉnh điểm Task sau khi tạo).
 */
@Schema(description = "Cập nhật points_reward của Task")
public record SetTaskPointsRequest(

        @Schema(description = "Điểm thưởng mới")
        @NotNull
        @Min(value = 0)
        Integer pointsReward
) {}