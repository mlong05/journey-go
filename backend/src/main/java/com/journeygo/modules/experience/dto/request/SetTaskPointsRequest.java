package com.journeygo.modules.experience.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

@Schema(description = "Cập nhật points_reward của Task")
public record SetTaskPointsRequest(

        @Schema(description = "Điểm thưởng mới")
        @NotNull
        @Min(value = 0)
        Integer pointsReward
) {}
