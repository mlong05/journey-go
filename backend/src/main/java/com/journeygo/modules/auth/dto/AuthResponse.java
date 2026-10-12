package com.journeygo.modules.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

@Schema(description = "Phản hồi xác thực chứa access token và refresh token")
@Builder
public record AuthResponse(
        @Schema(description = "Access token JWT dùng cho các request tiếp theo", example = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
        String accessToken,

        @Schema(description = "Refresh token để cấp mới access token", example = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...")
        String refreshToken,

        @Schema(description = "Loại token", example = "Bearer")
        String tokenType,

        @Schema(description = "Thời gian hết hạn của access token (mili-giây)", example = "900000")
        long expiresIn,

        @Schema(description = "Thông tin người dùng đăng nhập")
        UserResponse user
) {}
