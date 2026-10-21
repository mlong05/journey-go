package com.journeygo.modules.community.dto;

import jakarta.validation.constraints.NotBlank;

public record PostCommentRequest(
        @NotBlank(message = "Nội dung bình luận không được để trống")
        String content
) {
}
