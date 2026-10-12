package com.journeygo.modules.destination.dto;

import com.journeygo.modules.destination.entity.Destination;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

@Builder
@Schema(description = "Thông tin điểm đến")
public record DestinationResponse(

        @Schema(description = "ID điểm đến") Long id,
        @Schema(description = "Tên điểm đến") String name,
        @Schema(description = "Địa chỉ") String address,
        @Schema(description = "Vĩ độ") BigDecimal latitude,
        @Schema(description = "Kinh độ") BigDecimal longitude,
        @Schema(description = "Sức chứa (số người)") Integer capacity,
        @Schema(description = "Trạng thái phê duyệt") boolean approved,
        @Schema(description = "Đã xóa") boolean deleted,
        @Schema(description = "Người tạo") String createdBy,
        @Schema(description = "Thời gian tạo") Instant createdAt,
        @Schema(description = "Thời gian cập nhật") Instant updatedAt
) {
    public static DestinationResponse fromEntity(Destination d) {
        return DestinationResponse.builder()
                .id(d.getId())
                .name(d.getName())
                .address(d.getAddress())
                .latitude(d.getLatitude())
                .longitude(d.getLongitude())
                .capacity(d.getCapacity())
                .approved(d.isApproved())
                .deleted(d.isDeleted())
                .createdBy(d.getCreatedBy() != null ? d.getCreatedBy().getFullName() : null)
                .createdAt(d.getCreatedAt())
                .updatedAt(d.getUpdatedAt())
                .build();
    }
}
