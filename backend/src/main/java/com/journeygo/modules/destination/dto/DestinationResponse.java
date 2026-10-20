package com.journeygo.modules.destination.dto;

import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.entity.DestinationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Collections;
import java.util.List;

@Builder
@Schema(description = "Thông tin điểm đến")
public record DestinationResponse(

        @Schema(description = "ID điểm đến") Long id,
        @Schema(description = "Tên điểm đến") String name,
        @Schema(description = "Địa chỉ") String address,
        @Schema(description = "Vĩ độ") BigDecimal latitude,
        @Schema(description = "Kinh độ") BigDecimal longitude,
        @Schema(description = "Sức chứa (số người)") Integer capacity,
        @Schema(description = "Trạng thái phê duyệt (legacy)") boolean approved,
        @Schema(description = "Trạng thái quy trình (DRAFT, PENDING, PUBLISHED, REJECTED)") DestinationStatus status,
        @Schema(description = "Đã xóa") boolean deleted,
        @Schema(description = "ID khu vực") Long regionId,
        @Schema(description = "Khu vực") RegionResponse region,
        @Schema(description = "Danh sách chủ đề") List<ThemeResponse> themes,
        @Schema(description = "Số lượng nội dung văn hóa") int contentCount,
        @Schema(description = "Người tạo") String createdBy,
        @Schema(description = "Thời gian tạo") Instant createdAt,
        @Schema(description = "Thời gian cập nhật") Instant updatedAt
) {
    public static DestinationResponse fromEntity(Destination d) {
        if (d == null) return null;

        List<ThemeResponse> themeResponses = (d.getThemes() == null)
                ? Collections.emptyList()
                : d.getThemes().stream().map(ThemeResponse::fromEntity).toList();

        int count = (d.getContents() == null) ? 0 : d.getContents().size();

        return DestinationResponse.builder()
                .id(d.getId())
                .name(d.getName())
                .address(d.getAddress())
                .latitude(d.getLatitude())
                .longitude(d.getLongitude())
                .capacity(d.getCapacity())
                .approved(d.isApproved())
                .status(d.getStatus())
                .deleted(d.isDeleted())
                .regionId(d.getRegionId())
                .region(RegionResponse.fromEntity(d.getRegion()))
                .themes(themeResponses)
                .contentCount(count)
                .createdBy(d.getCreatedBy() != null ? d.getCreatedBy().getFullName() : null)
                .createdAt(d.getCreatedAt())
                .updatedAt(d.getUpdatedAt())
                .build();
    }
}
