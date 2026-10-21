package com.journeygo.modules.content.dto;

import com.journeygo.modules.content.entity.CulturalContent;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.time.Instant;

@Builder
@Schema(description = "Thông tin nội dung văn hóa")
public record CulturalContentResponse(

        @Schema(description = "ID nội dung") Long id,
        @Schema(description = "ID điểm đến liên kết") Long destinationId,
        @Schema(description = "Tên điểm đến liên kết") String destinationName,
        @Schema(description = "Tiêu đề nội dung") String title,
        @Schema(description = "Loại nội dung") String contentType,
        @Schema(description = "Thứ tự sắp xếp") int sequenceOrder,
        @Schema(description = "Mô tả ngắn gọn") String description,
        @Schema(description = "Nội dung bài viết") String contentText,
        @Schema(description = "Đường dẫn file media") String mediaUrl,
        @Schema(description = "Thời lượng phát (giây)") Integer duration,
        @Schema(description = "Số lượt phát / xem") long playCount,
        @Schema(description = "Đã xóa") boolean deleted,
        @Schema(description = "Thời gian tạo") Instant createdAt,
        @Schema(description = "Thời gian cập nhật") Instant updatedAt
) {
    public static CulturalContentResponse fromEntity(CulturalContent content) {
        if (content == null) return null;
        return CulturalContentResponse.builder()
                .id(content.getId())
                .destinationId(content.getDestination() != null ? content.getDestination().getId() : null)
                .destinationName(content.getDestination() != null ? content.getDestination().getName() : null)
                .title(content.getTitle())
                .contentType(content.getContentType())
                .sequenceOrder(content.getSequenceOrder())
                .description(content.getDescription())
                .contentText(content.getContentText())
                .mediaUrl(content.getMediaUrl())
                .duration(content.getDuration())
                .playCount(content.getPlayCount())
                .deleted(content.isDeleted())
                .createdAt(content.getCreatedAt())
                .updatedAt(content.getUpdatedAt())
                .build();
    }
}
