package com.journeygo.modules.destination.dto;

import com.journeygo.modules.destination.entity.Region;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.time.Instant;

@Builder
@Schema(description = "Thông tin khu vực")
public record RegionResponse(

        @Schema(description = "ID khu vực") Long id,
        @Schema(description = "Tên khu vực") String name,
        @Schema(description = "Slug") String slug,
        @Schema(description = "Đã xóa") boolean deleted,
        @Schema(description = "Thời gian tạo") Instant createdAt,
        @Schema(description = "Thời gian cập nhật") Instant updatedAt
) {
    public static RegionResponse fromEntity(Region region) {
        if (region == null) return null;
        return RegionResponse.builder()
                .id(region.getId())
                .name(region.getName())
                .slug(region.getSlug())
                .deleted(region.isDeleted())
                .createdAt(region.getCreatedAt())
                .updatedAt(region.getUpdatedAt())
                .build();
    }
}
