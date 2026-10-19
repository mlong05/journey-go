package com.journeygo.modules.content.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Yêu cầu tạo hoặc cập nhật nội dung văn hóa")
public record CulturalContentRequest(

        @Schema(description = "Tiêu đề nội dung", example = "Truyền thuyết Hồ Hoàn Kiếm")
        @NotBlank(message = "Tiêu đề không được để trống")
        @Size(max = 200, message = "Tiêu đề không được quá 200 ký tự")
        String title,

        @Schema(description = "Loại nội dung (AUDIO, VIDEO, ARTICLE, STORY, IMAGE, 3D_VR)", example = "AUDIO")
        @NotBlank(message = "Loại nội dung không được để trống")
        String contentType,

        @Schema(description = "Thứ tự sắp xếp", example = "1")
        @Min(value = 0, message = "Thứ tự phải >= 0")
        int sequenceOrder,

        @Schema(description = "Mô tả ngắn gọn", example = "Câu chuyện trao gươm báu của vua Lê Lợi")
        String description,

        @Schema(description = "Nội dung bài viết hoặc kịch bản chi tiết")
        String contentText,

        @Schema(description = "Đường dẫn file media (âm thanh, video, ảnh)", example = "https://cdn.journeygo.com/audio/hoan-kiem-legend.mp3")
        String mediaUrl,

        @Schema(description = "Thời lượng phát (giây) nếu là audio/video", example = "180")
        @Min(value = 0, message = "Thời lượng phải >= 0")
        Integer duration
) {}
