package com.journeygo.modules.community.dto;

import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotBlank;

public record PostCommentRequest(
        @NotBlank(message = "Nội dung bình luận không được để trống")
        @Size(max = 1000, message = "Bình luận không được vượt quá 1000 ký tự")
        String content
) {
}
