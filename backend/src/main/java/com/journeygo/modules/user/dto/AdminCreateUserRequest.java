package com.journeygo.modules.user.dto;

import com.journeygo.modules.user.entity.Role;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Yêu cầu tạo tài khoản bởi Admin")
public record AdminCreateUserRequest(
        @Schema(description = "Email người dùng", example = "john.doe@journeygo.com")
        @NotBlank(message = "Email không được để trống")
        @Email(message = "Email không đúng định dạng")
        String email,

        @Schema(description = "Mật khẩu khởi tạo", example = "Password123@")
        @NotBlank(message = "Mật khẩu không được để trống")
        @Size(min = 6, message = "Mật khẩu phải có tối thiểu 6 ký tự")
        String password,

        @Schema(description = "Họ và tên", example = "John Doe")
        @NotBlank(message = "Họ tên không được để trống")
        String fullName,

        @Schema(description = "Số điện thoại", example = "0987654321")
        String phone,

        @Schema(description = "Vai trò phân quyền (TOURIST, MODERATOR, PROVIDER, ADMIN)", example = "TOURIST")
        Role role,

        @Schema(description = "Trạng thái kích hoạt tài khoản", example = "true")
        Boolean active
) {}
