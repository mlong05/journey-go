package com.journeygo.modules.experience.dto.request;

import com.journeygo.modules.experience.entity.enums.VerificationMethod;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

@Schema(description = "Yêu cầu tạo TaskType")
public record CreateTaskTypeRequest(

        @Schema(description = "Mã loại (UNIQUE)", example = "AUDIO_CLUE")
        @NotBlank
        @Size(max = 50)
        String code,

        @Schema(description = "Tên hiển thị")
        @NotBlank
        @Size(max = 100)
        String name,

        @Schema(description = "Loại task này có Question/Answer không?")
        Boolean hasQuestions,

        @Schema(description = "Loại task này cần location không?")
        Boolean requiresLocation,

        @Schema(description = "Phương thức xác minh", example = "ANSWER_MATCH")
        VerificationMethod verificationMethod
) {}
