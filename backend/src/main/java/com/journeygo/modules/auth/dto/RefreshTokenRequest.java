package com.journeygo.modules.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Yêu cầu làm mới access token")
public record RefreshTokenRequest(
        @Schema(description = "Refresh token hiện tại", example = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
        @NotBlank(message = "Refresh token không được để trống")
        String refreshToken
) {}
