package com.journeygo.modules.destination.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Yêu cầu tạo hoặc cập nhật khu vực")
public record RegionRequest(

        @Schema(description = "Tên khu vực", example = "Đồng bằng sông Cửu Long")
        @NotBlank(message = "Tên khu vực không được để trống")
        @Size(max = 150, message = "Tên khu vực không được quá 150 ký tự")
        String name,

        @Schema(description = "Đường dẫn định danh (slug)", example = "dong-bang-song-cuu-long")
        @Size(max = 150, message = "Slug không được quá 150 ký tự")
        String slug
) {}
