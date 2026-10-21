package com.journeygo.modules.community.dto;

import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record CreatePostRequest(
        @NotBlank(message = "Tiêu đề bài viết không được để trống")
        String title,

        @NotBlank(message = "Nội dung bài viết không được để trống")
        String content,

        Long tourId,

        Long destinationId,

        Long journeyId,

        List<String> mediaUrls,

        Boolean saveAsDraft
) {
}
