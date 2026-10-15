package com.journeygo.modules.experience.dto.response;

import com.journeygo.modules.experience.entity.TaskType;
import com.journeygo.modules.experience.entity.enums.VerificationMethod;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

/**
 * Response TaskType (master data, PUBLIC — không cần auth).
 */
@Builder
@Schema(description = "Response TaskType")
public record TaskTypeResponse(

        @Schema(description = "ID") Long id,
        @Schema(description = "Mã") String code,
        @Schema(description = "Tên") String name,
        @Schema(description = "Có Question?") boolean hasQuestions,
        @Schema(description = "Cần location?") boolean requiresLocation,
        @Schema(description = "Phương thức xác minh") VerificationMethod verificationMethod
) {
    public static TaskTypeResponse fromEntity(TaskType t) {
        return TaskTypeResponse.builder()
                .id(t.getId())
                .code(t.getCode())
                .name(t.getName())
                .hasQuestions(t.isHasQuestions())
                .requiresLocation(t.isRequiresLocation())
                .verificationMethod(t.getVerificationMethod())
                .build();
    }
}