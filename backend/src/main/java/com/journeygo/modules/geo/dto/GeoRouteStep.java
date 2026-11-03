package com.journeygo.modules.geo.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Một bước chỉ đường: làm gì ở điểm bắt đầu bước, rồi đi tiếp bao xa. */
public record GeoRouteStep(
        @Schema(description = "Hướng dẫn", example = "Rẽ trái vào Hoàng Quốc Việt") String instruction,
        @Schema(description = "Loại thao tác của Goong", example = "left") String maneuver,
        @Schema(description = "Quãng đường của bước (mét)") int distanceMeters,
        @Schema(description = "Thời gian của bước (giây)") int durationSeconds,
        @Schema(description = "Vĩ độ điểm bắt đầu bước") double lat,
        @Schema(description = "Kinh độ điểm bắt đầu bước") double lng
) {
}
