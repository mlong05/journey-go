package com.journeygo.modules.geo.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Một gợi ý khi gõ tìm địa chỉ. Chưa có tọa độ: gọi {@code /geo/place?refId=} khi người dùng chọn. */
public record GeoSuggestion(
        @Schema(description = "Mã địa điểm (place_id) Goong, dùng để lấy tọa độ") String refId,
        @Schema(description = "Tên địa điểm / số nhà + đường", example = "197 Trần Phú") String name,
        @Schema(description = "Phường/xã, tỉnh/thành", example = "Phường Chợ Quán, Thành Phố Hồ Chí Minh") String address,
        @Schema(description = "Chuỗi hiển thị đầy đủ") String display
) {
}
