package com.journeygo.modules.experience.dto.response;

import com.journeygo.modules.experience.entity.CheckInPoint;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Response CheckInPoint.
 *
 * Lưu ý: KHÔNG trả qrToken cho Tourist (chỉ cần khi đã quét QR). Nhưng CONTEXT không yêu cầu
 * mask → trả qrToken cho cả CP/CM/Tourist. Nếu sau này muốn ẨN, thêm forTourist().
 */
@Builder
@Schema(description = "Response CheckInPoint")
public record CheckInPointResponse(

        @Schema(description = "ID") Long id,
        @Schema(description = "ID Experience") Long experienceId,
        @Schema(description = "Tên") String name,
        @Schema(description = "Vĩ độ") BigDecimal latitude,
        @Schema(description = "Kinh độ") BigDecimal longitude,
        @Schema(description = "Bán kính (mét)") Integer radiusMeters,
        @Schema(description = "Token QR") String qrToken,
        @Schema(description = "Thứ tự") Integer sequenceOrder,
        @Schema(description = "Ngày tạo") Instant createdAt
) {
    public static CheckInPointResponse fromEntity(CheckInPoint c) {
        return CheckInPointResponse.builder()
                .id(c.getId())
                .experienceId(c.getExperience() != null ? c.getExperience().getId() : null)
                .name(c.getName())
                .latitude(c.getLatitude())
                .longitude(c.getLongitude())
                .radiusMeters(c.getRadiusMeters())
                .qrToken(c.getQrToken())
                .sequenceOrder(c.getSequenceOrder())
                .createdAt(c.getCreatedAt())
                .build();
    }
}