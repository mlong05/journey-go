package com.journeygo.modules.content.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(name = "CulturalContentWithImageForm", description = "Thông tin cultural content và file ảnh tải lên cùng lúc")
public record CulturalContentWithImageForm(
        @Schema(description = "Thông tin cultural content dạng JSON")
        CulturalContentRequest content,

        @Schema(description = "File ảnh JPG, PNG, WEBP hoặc AVIF", type = "string", format = "binary")
        String image
) {}
