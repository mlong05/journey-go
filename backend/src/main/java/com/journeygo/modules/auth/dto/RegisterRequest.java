package com.journeygo.modules.auth.dto;

import com.journeygo.modules.user.entity.Role;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Yêu cầu đăng ký tài khoản mới")
public record RegisterRequest(
        @Schema(description = "Email đăng ký", example = "user@journeygo.com")
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        String email,

        @Schema(description = "Mật khẩu", example = "Password123@")
        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 6, message = "Mật khẩu phải có tối thiểu 6 ký tự")
        String password,

        @Schema(description = "Họ và tên", example = "Nguyễn Văn A")
        @NotBlank(message = "Họ tên không được để trống")
        String fullName,

        @Schema(description = "Số điện thoại", example = "0912345678")
        String phone,

        @Schema(description = "Vai trò người dùng (USER, PROVIDER)", example = "USER")
        Role role
) {}
