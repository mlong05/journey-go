package com.journeygo.modules.settlement.dto.response;

import com.journeygo.modules.providerrevenue.entity.enums.ProviderRevenueStatus;
import com.journeygo.modules.voucher.entity.enums.VoucherScope;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Một giao dịch tour của đối tác trong một kỳ tất toán đã chốt.
 *
 * <p>Đối tác chỉ xem được các giao dịch thuộc {@code settlement_details} của chính họ —
 * không bao giờ thấy giao dịch của đối tác khác, kể cả trong đợt tất toán TỔNG (BATCH).
 *
 * <p>⚠️ Cột "Voucher" / "Hoàn tiền" là TUỲ CHỌN THEO GIAO DỊCH — không phải giao dịch
 * nào cũng có. Giao dịch không áp voucher ⇒ {@code voucherDiscount = 0} và
 * {@code voucherScope = null}; giao dịch không bị hoàn tiền ⇒ {@code refundAmount = 0}.
 *
 * @param bookingCode     mã đơn đặt tour
 * @param tourTitle       tên tour
 * @param experienceDate  ngày trải nghiệm (ngày khởi hành)
 * @param revenuePeriod   kỳ doanh thu gốc của giao dịch (yyyy-MM)
 */
@Builder
@Schema(description = "Giao dịch tour của đối tác trong kỳ tất toán")
public record ProviderSettlementTransactionResponse(

        @Schema(description = "ID khoản doanh thu") Long revenueId,
        @Schema(description = "ID booking") Long bookingId,
        @Schema(description = "Mã booking") String bookingCode,
        @Schema(description = "Mã giao dịch thanh toán (txnRef)") String txnRef,
        @Schema(description = "Tên tour") String tourTitle,
        @Schema(description = "Ngày trải nghiệm") LocalDate experienceDate,
        @Schema(description = "Kỳ doanh thu gốc (yyyy-MM)") String revenuePeriod,
        @Schema(description = "Giá trị gốc (tổng thanh toán ban đầu)") BigDecimal grossAmount,
        @Schema(description = "Số tiền voucher đã giảm (0 nếu giao dịch không áp voucher)")
        BigDecimal voucherDiscount,
        @Schema(description = "Phạm vi voucher (null nếu không áp voucher)") VoucherScope voucherScope,
        @Schema(description = "Tổng hoàn tiền (0 nếu giao dịch không bị hoàn tiền)") BigDecimal refundAmount,
        @Schema(description = "Hoa hồng nền tảng") BigDecimal commissionAmount,
        @Schema(description = "Điều chỉnh") BigDecimal adjustmentAmount,
        @Schema(description = "Tiền đối tác nhận được") BigDecimal providerNetAmount,
        @Schema(description = "Trạng thái khoản doanh thu") ProviderRevenueStatus status
) {
}
