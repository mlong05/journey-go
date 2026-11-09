package com.journeygo.modules.destination.dto;

import com.journeygo.modules.destination.entity.Theme;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.time.Instant;

@Builder
@Schema(description = "Thông tin chủ đề du lịch")
public record ThemeResponse(

        @Schema(description = "ID chủ đề") Long id,
        @Schema(description = "Tên chủ đề") String name,
        @Schema(description = "Slug") String slug,
        @Schema(description = "URL ảnh đại diện") String imageUrl,
        @Schema(description = "Ghi nguồn ảnh") String imageCredit,
        @Schema(description = "Đã xóa") boolean deleted,
        @Schema(description = "Thời gian tạo") Instant createdAt,
        @Schema(description = "Thời gian cập nhật") Instant updatedAt
) {
    public static ThemeResponse fromEntity(Theme theme) {
        if (theme == null) return null;
        return ThemeResponse.builder()
                .id(theme.getId())
                .name(theme.getName())
                .slug(theme.getSlug())
                .imageUrl(theme.getImageUrl())
                .imageCredit(theme.getImageCredit())
                .deleted(theme.isDeleted())
                .createdAt(theme.getCreatedAt())
                .updatedAt(theme.getUpdatedAt())
                .build();
    }
}
