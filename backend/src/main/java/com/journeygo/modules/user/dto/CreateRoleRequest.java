package com.journeygo.modules.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

@Schema(description = "Yêu cầu tạo vai trò mới bởi Admin")
public record CreateRoleRequest(
        @Schema(description = "Tên vai trò (chỉ gồm chữ hoa, số và dấu gạch dưới, từ 2-50 ký tự)", example = "CONTENT_PROVIDER")
        @NotBlank(message = "Tên vai trò không được để trống")
        @Size(min = 2, max = 50, message = "Tên vai trò phải từ 2 đến 50 ký tự")
        @Pattern(regexp = "^[A-Za-z0-9_]+$", message = "Tên vai trò chỉ được chứa chữ cái, số và dấu gạch dưới (VD: CONTENT_PROVIDER, TOUR_GUIDE)")
        String name,

        @Schema(description = "Mô tả chi tiết vai trò", example = "Đối tác cung cấp dịch vụ bên ngoài")
        @Size(max = 255, message = "Mô tả vai trò không được vượt quá 255 ký tự")
        String description
) {}
