package com.journeygo.modules.user.dto;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Yêu cầu cập nhật ảnh đại diện người dùng")
public record UpdateAvatarRequest(
        @Schema(description = "URL hoặc Base64 ảnh đại diện", example = "https://example.com/avatar.png")
        String avatarUrl,

        @Schema(description = "Bí danh cho avatarUrl")
        String avatar
) {}
