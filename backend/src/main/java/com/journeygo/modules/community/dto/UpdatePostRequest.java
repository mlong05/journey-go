package com.journeygo.modules.community.dto;

import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotBlank;

import java.util.List;

public record UpdatePostRequest(
        @NotBlank(message = "Tiêu đề bài viết không được để trống")
        @Size(max = 200, message = "Tiêu đề không được vượt quá 200 ký tự")
        String title,

        @NotBlank(message = "Nội dung bài viết không được để trống")
        @Size(max = 5000, message = "Nội dung không được vượt quá 5000 ký tự")
        String content,

        @Size(max = 10, message = "Mỗi bài viết chỉ đính kèm tối đa 10 ảnh hoặc video")
        List<String> mediaUrls
) {
}
