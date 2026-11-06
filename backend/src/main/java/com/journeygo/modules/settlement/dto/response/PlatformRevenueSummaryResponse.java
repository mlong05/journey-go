package com.journeygo.modules.settlement.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.List;

/**
 * Tổng hợp DOANH THU NỀN TẢNG (ADMIN).
 *
 * <p>Doanh thu nền tảng = phần hoa hồng giữ lại sau khi tất toán cho đối tác:
 * {@code GrossAmount − RefundAmount − SettlementAmount}. Về mặt kế toán đây chính là
 * {@code CommissionAmount} cộng với các khoản điều chỉnh đã áp dụng.
 *
 * <p>⚠️ CHỈ tính trên các đợt tất toán đã DUYỆT ({@code APPROVED}) — đó là lúc tiền
 * thực sự được ghi vào ví đối tác. Kỳ đang chờ duyệt ({@code DRAFT}) chưa phải doanh thu
 * đã thu được ⇒ không tính vào để tránh báo cáo số liệu không thực.
 *
 * <p>Số liệu là TOÀN HỆ THỐNG, không phụ thuộc phân trang ⇒ dùng để hiển thị ở ô chỉ số.
 */
@Builder
@Schema(description = "Tổng hợp doanh thu nền tảng (chỉ tính đợt tất toán đã duyệt)")
public record PlatformRevenueSummaryResponse(

        @Schema(description = "Tổng doanh thu nền tảng đã thu (hoa hồng giữ lại)")
        BigDecimal totalPlatformRevenue,

        @Schema(description = "Tổng tiền khách đã thanh toán (trong các đợt đã duyệt)")
        BigDecimal totalGrossAmount,

        @Schema(description = "Tổng tiền đã hoàn khách")
        BigDecimal totalRefundAmount,

        @Schema(description = "Tổng tiền đã chi trả cho đối tác")
        BigDecimal totalProviderNetAmount,

        @Schema(description = "Tổng hoa hồng ghi nhận trong các đợt đã duyệt")
        BigDecimal totalCommissionAmount,

        @Schema(description = "Tổng điều chỉnh tài chính đã áp dụng")
        BigDecimal totalAdjustmentAmount,

        @Schema(description = "Số đợt tất toán đã duyệt")
        long approvedSettlementCount,

        @Schema(description = "Doanh thu nền tảng theo từng kỳ (mới nhất trước)")
        List<PeriodRevenue> periods
) {
    /** Doanh thu nền tảng của một kỳ doanh thu cụ thể. */
    @Builder
    @Schema(description = "Doanh thu nền tảng theo kỳ")
    public record PeriodRevenue(
            @Schema(description = "Kỳ doanh thu (yyyy-MM)") String revenuePeriod,
            @Schema(description = "Tổng tiền khách thanh toán") BigDecimal grossAmount,
            @Schema(description = "Tổng hoàn tiền") BigDecimal refundAmount,
            @Schema(description = "Tổng hoa hồng") BigDecimal commissionAmount,
            @Schema(description = "Tổng điều chỉnh") BigDecimal adjustmentAmount,
            @Schema(description = "Tổng chi trả đối tác") BigDecimal providerNetAmount,
            @Schema(description = "Doanh thu nền tảng của kỳ") BigDecimal platformRevenue,
            @Schema(description = "Số đợt tất toán đã duyệt trong kỳ") long settlementCount
    ) {
    }
}
