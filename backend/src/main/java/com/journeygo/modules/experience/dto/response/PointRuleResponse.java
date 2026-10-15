package com.journeygo.modules.experience.dto.response;

import com.journeygo.modules.experience.entity.PointRule;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.Map;

@Builder
@Schema(description = "Response PointRule")
public record PointRuleResponse(

        @Schema(description = "ID") Long id,
        @Schema(description = "ID TaskType") Long taskTypeId,
        @Schema(description = "Code TaskType") String taskTypeCode,
        @Schema(description = "Điểm nền") Integer basePoints,
        @Schema(description = "Hệ số nhân") BigDecimal bonusMultiplier,
        @Schema(description = "Điều kiện bonus (JSONB)") Map<String, Object> conditions
) {
    public static PointRuleResponse fromEntity(PointRule pr) {
        return PointRuleResponse.builder()
                .id(pr.getId())
                .taskTypeId(pr.getTaskType() != null ? pr.getTaskType().getId() : null)
                .taskTypeCode(pr.getTaskType() != null ? pr.getTaskType().getCode() : null)
                .basePoints(pr.getBasePoints())
                .bonusMultiplier(pr.getBonusMultiplier())
                .conditions(pr.getConditions())
                .build();
    }
}
