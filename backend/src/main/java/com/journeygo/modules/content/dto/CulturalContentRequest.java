package com.journeygo.modules.content.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;

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

        @Schema(hidden = true, description = "Đường dẫn media; ảnh được tải lên qua trường image")
        String mediaUrl,

        @Schema(hidden = true, description = "Cloudinary public ID nội bộ của ảnh")
        @Size(max = 255, message = "Cloudinary public ID không được quá 255 ký tự")
        String mediaPublicId,

        @Schema(description = "Thời lượng phát (giây) nếu là audio/video", example = "180")
        @Min(value = 0, message = "Thời lượng phải >= 0")
        Integer duration,

        @Schema(description = "Thư viện ảnh của nội dung (URL https đã tải lên qua /upload/image)")
        @Size(max = MAX_IMAGES, message = "Tối đa " + MAX_IMAGES + " ảnh cho mỗi nội dung")
        List<@NotBlank @Size(max = 1000, message = "Đường dẫn ảnh không được quá 1000 ký tự") String> imageUrls
) {
    public static final int MAX_IMAGES = 20;

    /** Preserve compatibility with callers that predate the image gallery field. */
    public CulturalContentRequest(String title, String contentType, int sequenceOrder,
                                  String description, String contentText, String mediaUrl,
                                  String mediaPublicId, Integer duration) {
        this(title, contentType, sequenceOrder, description, contentText, mediaUrl, mediaPublicId, duration, null);
    }

    /** Preserve compatibility with clients that predate the Cloudinary public ID field. */
    public CulturalContentRequest(String title, String contentType, int sequenceOrder,
                                  String description, String contentText, String mediaUrl,
                                  Integer duration) {
        this(title, contentType, sequenceOrder, description, contentText, mediaUrl, null, duration, null);
    }
}
