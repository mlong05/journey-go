package com.journeygo.modules.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ChangePasswordRequest(
        @Schema(description = "Mật khẩu hiện tại (có thể bỏ trống nếu tài khoản Google chưa từng đặt mật khẩu)", example = "OldSecret123@")
        String currentPassword,

        @NotBlank(message = "Mật khẩu mới không được để trống")
        @Size(min = 6, max = 100, message = "Mật khẩu mới phải từ 6 đến 100 ký tự")
        @Schema(description = "Mật khẩu mới muốn đổi", example = "NewSecret123@")
        String newPassword,

        @NotBlank(message = "Xác nhận mật khẩu mới không được để trống")
        @Schema(description = "Nhập lại mật khẩu mới để xác nhận", example = "NewSecret123@")
        String confirmPassword
) {
}
