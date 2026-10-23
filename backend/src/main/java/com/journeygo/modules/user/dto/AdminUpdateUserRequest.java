package com.journeygo.modules.user.dto;

import com.journeygo.modules.user.entity.Role;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Yêu cầu cập nhật thông tin người dùng bởi Admin")
public record AdminUpdateUserRequest(
        @Schema(description = "Họ và tên", example = "John Doe")
        @NotBlank(message = "Họ tên không được để trống")
        String fullName,

        @Schema(description = "Số điện thoại", example = "0987654321")
        String phone,

        @Schema(description = "Vai trò (TOURIST, MODERATOR, PROVIDER, ADMIN)", example = "TOURIST")
        Role role,

        @Schema(description = "Trạng thái hoạt động", example = "true")
        Boolean active
) {}
