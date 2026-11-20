package com.journeygo.modules.settlement.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;

/**
 * Tổng hợp số liệu cho tab "Tài chính &amp; Thanh toán" (ADMIN).
 *
 * <p>Gồm 4 ô chỉ số:
 * <ul>
 *   <li><b>Giao dịch thành công</b> — số lượng đơn đã thanh toán.</li>
 *   <li><b>Tổng tiền giao dịch</b> — giá trị gốc ban đầu của các giao dịch thành công
 *       (đã bao gồm phần voucher giảm).</li>
 *   <li><b>Tổng tiền đã hoàn</b> — đã hoàn trả cho khách.</li>
 *   <li><b>Thực thu nền tảng</b> — dòng tiền thực tế nhận được
 *       (= tổng tiền giao dịch − tổng tiền đã hoàn).</li>
 * </ul>
 *
 * <p>⚠️ "Thực thu nền tảng" KHÔNG trừ phần % chia cho đối tác — phần đó thuộc về
 * chi phí vận hành và được hiển thị ở tab "Tất toán doanh thu".
 */
@Builder
@Schema(description = "Tổng hợp số liệu tab Tài chính & Thanh toán")
public record FinanceSummaryResponse(

        @Schema(description = "Số lượng đơn đã thanh toán thành công")
        long successCount,

        @Schema(description = "Tổng tiền giao dịch — giá trị gốc ban đầu (đã bao gồm voucher)")
        BigDecimal totalTransactionAmount,

        @Schema(description = "Tổng số tiền voucher đã giảm trên các giao dịch thành công")
        BigDecimal totalDiscountAmount,

        @Schema(description = "Tổng tiền đã hoàn trả cho khách")
        BigDecimal totalRefundedAmount,

        @Schema(description = "Thực thu nền tảng — dòng tiền thực tế nhận được "
                + "(= tổng tiền giao dịch − tổng voucher − tổng tiền đã hoàn)")
        BigDecimal netPlatformRevenue
) {
}
