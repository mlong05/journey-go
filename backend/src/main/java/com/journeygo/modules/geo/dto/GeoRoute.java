package com.journeygo.modules.geo.dto;

import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

/** Tuyến đường giữa hai điểm, kèm các bước chỉ đường bằng tiếng Việt. */
public record GeoRoute(
        @Schema(description = "Tổng quãng đường (mét)") int distanceMeters,
        @Schema(description = "Thời gian dự kiến (giây)") int durationSeconds,
        @Schema(description = "Quãng đường dạng chữ", example = "2.8 km") String distanceText,
        @Schema(description = "Thời gian dạng chữ", example = "8 phút") String durationText,
        @Schema(description = "Các điểm [vĩ độ, kinh độ] vẽ đường đi theo thứ tự") List<double[]> points,
        @Schema(description = "Các bước chỉ đường") List<GeoRouteStep> steps
) {
}
