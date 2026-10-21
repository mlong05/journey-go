package com.journeygo.modules.destination.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Yêu cầu tạo hoặc cập nhật chủ đề du lịch")
public record ThemeRequest(

        @Schema(description = "Tên chủ đề", example = "Di sản văn hóa")
        @NotBlank(message = "Tên chủ đề không được để trống")
        @Size(max = 150, message = "Tên chủ đề không được quá 150 ký tự")
        String name,

        @Schema(description = "Đường dẫn định danh (slug)", example = "di-san-van-hoa")
        @Size(max = 150, message = "Slug không được quá 150 ký tự")
        String slug
) {}
