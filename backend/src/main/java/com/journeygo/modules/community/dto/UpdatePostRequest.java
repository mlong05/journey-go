package com.journeygo.modules.community.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record UpdatePostRequest(
        @NotBlank(message = "Tiêu đề bài viết không được để trống")
        String title,

        @NotBlank(message = "Nội dung bài viết không được để trống")
        String content,

        List<String> mediaUrls
) {
}
