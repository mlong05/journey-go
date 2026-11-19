package com.journeygo.modules.settlement.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;

/**
 * Tổng hợp số liệu cho tab "Tổng quan &amp; Duyệt đợt" (ADMIN).
 *
 * <p>Gồm 5 ô chỉ số (mỗi ô có một dòng chú thích ngắn bên dưới):
 * <ul>
 *   <li><b>Thực thu nền tảng</b> — dòng tiền nền tảng thực tế nhận được.</li>
 *   <li><b>Doanh thu nền tảng</b> — tổng doanh thu gốc (trước khi trừ hoàn + chi trả đối tác).</li>
 *   <li><b>Doanh thu đối tác</b> — tổng tiền đã chi trả cho toàn bộ đối tác.</li>
 *   <li><b>Số đợt đã duyệt</b> — số đợt tất toán đã hoàn tất.</li>
 *   <li><b>Đợt chờ duyệt</b> — số đợt đang chờ Admin duyệt/từ chối.</li>
 * </ul>
 */
@Builder
@Schema(description = "Tổng hợp số liệu tab Tổng quan & Duyệt đợt")
public record SettlementOverviewResponse(

        @Schema(description = "Thực thu nền tảng — dòng tiền thực tế nhận được")
        BigDecimal netPlatformRevenue,

        @Schema(description = "Tổng doanh thu nền tảng (gốc)")
        BigDecimal totalGrossAmount,

        @Schema(description = "Tổng tiền đã hoàn trả cho khách")
        BigDecimal totalRefundAmount,

        @Schema(description = "Tổng doanh thu đối tác — tiền đã chi trả cho toàn bộ đối tác")
        BigDecimal totalProviderNetAmount,

        @Schema(description = "Số đợt tất toán đã duyệt")
        long approvedSettlementCount,

        @Schema(description = "Số đợt tất toán đang chờ duyệt")
        long pendingSettlementCount,

        @Schema(description = "Tổng tiền các đợt đang chờ duyệt")
        BigDecimal pendingSettlementAmount
) {
}
