package com.journeygo.modules.experience.dto.request;

import com.journeygo.modules.experience.entity.enums.UnlockConditionType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

@Schema(description = "Cấu hình UnlockCondition cho Task")
public record SetUnlockConditionRequest(

        @Schema(description = "Loại điều kiện")
        @NotNull
        UnlockConditionType conditionType,

        @Schema(description = "Task tiên quyết (bắt buộc khi SEQUENTIAL)")
        Long prerequisiteTaskId,

        @Schema(description = "Điểm tối thiểu (0-100) — bắt buộc khi SCORE_BASED")
        @Min(0) @Max(100)
        Integer minimumScorePercent,

        @Schema(description = "Sau khoảng thời gian (phút) — bắt buộc khi TIME_BASED")
        @Min(1)
        Integer timeWindowMinutes,

        @Schema(description = "CheckInPoint yêu cầu (bắt buộc khi LOCATION_VERIFICATION)")
        Long checkInPointId,

        @Schema(description = "Mô tả")
        String description
) {}
