package com.journeygo.modules.auth.dto;

import com.journeygo.modules.user.entity.Role;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

public record GoogleAuthRequest(
        @NotBlank(message = "ID Token không được để trống")
        @Schema(description = "Google ID Token (credential) nhận từ Google Identity Services trên Client", example = "eyJhbGciOiJSUzI1NiIsImtpZCI...")
        String idToken,

        @Schema(description = "Vai trò mong muốn nếu tài khoản được đăng ký mới (mặc định TOURIST)", example = "TOURIST")
        Role role
) {
}
