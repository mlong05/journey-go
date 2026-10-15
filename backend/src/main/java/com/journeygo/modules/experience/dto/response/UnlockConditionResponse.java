package com.journeygo.modules.experience.dto.response;

import com.journeygo.modules.experience.entity.UnlockCondition;
import com.journeygo.modules.experience.entity.enums.UnlockConditionType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "Response UnlockCondition")
public record UnlockConditionResponse(

        @Schema(description = "ID") Long id,
        @Schema(description = "ID Task") Long taskId,
        @Schema(description = "ID Task tiên quyết (SEQUENTIAL)") Long prerequisiteTaskId,
        @Schema(description = "Loại điều kiện") UnlockConditionType conditionType,
        @Schema(description = "Điểm tối thiểu 0-100 (SCORE_BASED)") Integer minimumScorePercent,
        @Schema(description = "Khoảng thời gian phút (TIME_BASED)") Integer timeWindowMinutes,
        @Schema(description = "ID CheckInPoint yêu cầu (LOCATION_VERIFICATION)") Long checkInPointId,
        @Schema(description = "Mô tả") String description
) {
    public static UnlockConditionResponse fromEntity(UnlockCondition u) {
        return UnlockConditionResponse.builder()
                .id(u.getId())
                .taskId(u.getTask() != null ? u.getTask().getId() : null)
                .prerequisiteTaskId(u.getPrerequisiteTask() != null ? u.getPrerequisiteTask().getId() : null)
                .conditionType(u.getConditionType())
                .minimumScorePercent(u.getMinimumScorePercent())
                .timeWindowMinutes(u.getTimeWindowMinutes())
                .checkInPointId(u.getCheckInPoint() != null ? u.getCheckInPoint().getId() : null)
                .description(u.getDescription())
                .build();
    }
}
