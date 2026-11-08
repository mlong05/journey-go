package com.journeygo.modules.experience.dto.response;

import com.journeygo.modules.experience.entity.TaskType;
import com.journeygo.modules.experience.entity.enums.VerificationMethod;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Builder
@Schema(description = "Response TaskType")
public record TaskTypeResponse(

        @Schema(description = "ID") Long id,
        @Schema(description = "Mã") String code,
        @Schema(description = "Tên") String name,
        @Schema(description = "Có Question?") boolean hasQuestions,
        @Schema(description = "Cần location?") boolean requiresLocation,
        @Schema(description = "Phương thức xác minh") VerificationMethod verificationMethod,
        @Schema(description = "Điểm thưởng mỗi nhiệm vụ thuộc loại này (PointRule.basePoints); null = chưa cấu hình") Integer basePoints
) {
    public static TaskTypeResponse fromEntity(TaskType t) {
        return fromEntity(t, null);
    }

    public static TaskTypeResponse fromEntity(TaskType t, Integer basePoints) {
        return TaskTypeResponse.builder()
                .id(t.getId())
                .code(t.getCode())
                .name(t.getName())
                .hasQuestions(t.isHasQuestions())
                .requiresLocation(t.isRequiresLocation())
                .verificationMethod(t.getVerificationMethod())
                .basePoints(basePoints)
                .build();
    }
}
