package com.journeygo.modules.auth.dto;

import com.journeygo.modules.user.entity.Role;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

public record GoogleAuthRequest(
        @NotBlank(message = "ID Token không được để trống")
        @Schema(description = "Google ID Token (credential) nhận từ Google Identity Services trên Client", example = "eyJhbGciOiJSUzI1NiIsImtpZCI...")
        String idToken,

        @Schema(description = "Vai trò mong muốn — KHÔNG được dùng, server luôn gán TOURIST cho luồng public. "
                + "Muốn trở thành đối tác hãy gửi đơn tại /api/v1/partner-applications.",
                example = "TOURIST", deprecated = true)
        Role role
) {
}
