package com.journeygo.modules.partnerapplication.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

public record SendPartnerOtpRequest(
        @Schema(description = "Email cần xác minh", example = "doanhnghiep@example.com")
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không hợp lệ")
        String email
) {
}
