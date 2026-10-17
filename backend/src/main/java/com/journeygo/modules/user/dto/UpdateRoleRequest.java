package com.journeygo.modules.user.dto;

import com.journeygo.modules.user.entity.Role;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Yêu cầu cập nhật vai trò người dùng")
public record UpdateRoleRequest(
        @Schema(description = "Vai trò mới của người dùng (USER, MODERATOR, PROVIDER, ADMIN)", example = "MODERATOR")
        @NotNull(message = "Vai trò không được để trống")
        Role role
) {}
