package com.journeygo.modules.settlement.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

/**
 * Một kỳ tất toán ĐÃ CHỐT mà đối tác được thấy, kèm các giao dịch tour của riêng họ.
 *
 * <p>Quy tắc hiển thị cho đối tác:
 * <ul>
 *   <li>CHỈ hiển thị đợt đã được Admin duyệt ({@code APPROVED}) — tức là khi tiền đã
 *       cộng vào ví đối tác.</li>
 *   <li>Các số tiền ({@code grossAmount}, …) được tính theo RIÊNG đối tác, kể cả khi
 *       đợt tất toán có phạm vi TỔNG (BATCH) gồm nhiều đối tác.</li>
 *   <li>Kèm danh sách giao dịch tour đã tất toán của đối tác trong kỳ đó.</li>
 * </ul>
 */
@Builder
@Schema(description = "Kỳ tất toán đã chốt của đối tác")
public record ProviderSettlementPeriodResponse(

        @Schema(description = "ID settlement") Long settlementId,
        @Schema(description = "Mã settlement") String settlementCode,
        @Schema(description = "Phạm vi đợt (PROVIDER | BATCH)") String scope,
        @Schema(description = "Kỳ doanh thu — chu kỳ 10 ngày (yyyy-MM-D), VD: 2026-10-1 = 01/10 → 10/10/2026")
        String revenuePeriod,
        @Schema(description = "Nhãn kỳ tất toán đầy đủ, VD: '01/10 – 10/10/2026'") String periodLabel,
        @Schema(description = "Ngày bắt đầu kỳ") LocalDate periodStart,
        @Schema(description = "Ngày kết thúc kỳ") LocalDate periodEnd,
        @Schema(description = "Thời điểm admin duyệt") Instant approvedAt,
        @Schema(description = "Tổng thanh toán ban đầu của đối tác") BigDecimal grossAmount,
        @Schema(description = "Tổng hoàn tiền của đối tác") BigDecimal refundAmount,
        @Schema(description = "Tổng hoa hồng của đối tác") BigDecimal commissionAmount,
        @Schema(description = "Tổng điều chỉnh của đối tác") BigDecimal adjustmentAmount,
        @Schema(description = "Tổng tiền đối tác nhận được") BigDecimal settlementAmount,
        @Schema(description = "Số giao dịch tour trong kỳ") int transactionCount,
        @Schema(description = "Danh sách giao dịch tour của đối tác trong kỳ")
        List<ProviderSettlementTransactionResponse> transactions
) {
}
