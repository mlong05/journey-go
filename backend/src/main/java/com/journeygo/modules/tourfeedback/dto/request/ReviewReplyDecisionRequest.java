package com.journeygo.modules.tourfeedback.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ReviewReplyDecisionRequest(
        @NotBlank(message = "Lý do từ chối không được để trống")
        @Size(max = 500, message = "Lý do tối đa 500 ký tự")
        @Schema(description = "Lý do từ chối phản hồi của đối tác")
        String reason
) {
}
