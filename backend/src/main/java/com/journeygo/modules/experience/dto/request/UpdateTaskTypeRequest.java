package com.journeygo.modules.experience.dto.request;

import com.journeygo.modules.experience.entity.enums.VerificationMethod;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

/**
 * Sửa TaskType (Admin only).
 */
@Schema(description = "Cập nhật TaskType")
public record UpdateTaskTypeRequest(

        @Schema(description = "Tên hiển thị")
        @Size(max = 100)
        String name,

        @Schema(description = "Loại task này có Question/Answer không?")
        Boolean hasQuestions,

        @Schema(description = "Loại task này cần location không?")
        Boolean requiresLocation,

        @Schema(description = "Phương thức xác minh", example = "ANSWER_MATCH")
        VerificationMethod verificationMethod
) {}