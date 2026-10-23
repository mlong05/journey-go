package com.journeygo.modules.user.dto;

import com.journeygo.modules.user.entity.Role;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(description = "Thông tin chi tiết vai trò người dùng")
public record RoleResponse(
        @Schema(description = "ID của vai trò", example = "1")
        Long id,

        @Schema(description = "Tên vai trò", example = "TOURIST")
        String name,

        @Schema(description = "Mô tả vai trò", example = "Khách du lịch trải nghiệm hệ thống")
        String description,

        @Schema(description = "Có phải vai trò mặc định của hệ thống không", example = "true")
        boolean isSystem,

        @Schema(description = "Thời gian tạo")
        Instant createdAt,

        @Schema(description = "Thời gian cập nhật gần nhất")
        Instant updatedAt
) {
    public static RoleResponse fromEntity(Role role) {
        if (role == null) {
            return null;
        }
        return new RoleResponse(
                role.getId(),
                role.getName(),
                role.getDescription(),
                role.isSystem(),
                role.getCreatedAt(),
                role.getUpdatedAt()
        );
    }
}
