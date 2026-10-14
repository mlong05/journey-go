package com.journeygo.modules.auth.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record ResetPasswordRequest(
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        @Schema(description = "Email tài khoản đặt lại mật khẩu", example = "user@journeygo.com")
        String email,

        @NotBlank(message = "Mã OTP không được để trống")
        @Size(min = 6, max = 6, message = "Mã OTP phải có đúng 6 chữ số")
        @Schema(description = "Mã OTP 6 chữ số đã nhận qua email", example = "123456")
        String otp,

        @NotBlank(message = "Mật khẩu mới không được để trống")
        @Size(min = 6, max = 100, message = "Mật khẩu mới phải từ 6 đến 100 ký tự")
        @Schema(description = "Mật khẩu mới muốn đặt", example = "NewSecret123@")
        String newPassword,

        @NotBlank(message = "Xác nhận mật khẩu không được để trống")
        @Schema(description = "Xác nhận lại mật khẩu mới", example = "NewSecret123@")
        String confirmPassword
) {
}
