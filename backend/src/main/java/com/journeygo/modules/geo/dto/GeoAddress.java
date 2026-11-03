package com.journeygo.modules.geo.dto;

import io.swagger.v3.oas.annotations.media.Schema;

/** Địa chỉ theo đơn vị hành chính 2 cấp (từ 01/07/2025): xã/phường + tỉnh/thành. */
public record GeoAddress(
        @Schema(description = "Chuỗi hiển thị đầy đủ") String display,
        @Schema(description = "Phần địa chỉ cụ thể: số nhà, đường, tên địa điểm", example = "197 Đường Trần Phú") String detail,
        @Schema(description = "Xã/phường/đặc khu", example = "Phường Chợ Quán") String ward,
        @Schema(description = "Tỉnh/thành phố", example = "Thành Phố Hồ Chí Minh") String province,
        @Schema(description = "Vĩ độ") Double lat,
        @Schema(description = "Kinh độ") Double lng
) {
}
