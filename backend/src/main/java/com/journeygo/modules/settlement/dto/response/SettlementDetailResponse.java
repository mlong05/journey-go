package com.journeygo.modules.settlement.dto.response;

import com.journeygo.modules.providerrevenue.entity.enums.ProviderRevenueStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;

/**
 * Chi tiết một khoản doanh thu trong Settlement — cho phép Admin xem từng Booking, Payment,
 * Refund, hoa hồng và cách tính số tiền (Mục 7.3 — "không chỉ lưu tổng tiền mà thiếu chi tiết nguồn").
 */
@Builder
@Schema(description = "Chi tiết khoản doanh thu được chọn vào Settlement")
public record SettlementDetailResponse(

        @Schema(description = "ID chi tiết") Long id,
        @Schema(description = "ID settlement") Long settlementId,
        @Schema(description = "ID khoản doanh thu") Long providerRevenueId,
        @Schema(description = "ID đối tác sở hữu khoản doanh thu") Long providerProfileId,
        @Schema(description = "Tên đối tác") String providerName,
        @Schema(description = "ID booking") Long bookingId,
        @Schema(description = "Mã đơn") String bookingCode,
        @Schema(description = "ID payment") Long paymentId,
        @Schema(description = "Mã giao dịch thanh toán") String txnRef,
        @Schema(description = "Kỳ doanh thu gốc (có thể khác kỳ Settlement — doanh thu chuyển tiếp)")
        String revenuePeriod,
        @Schema(description = "Tổng thanh toán ban đầu") BigDecimal grossAmount,
        @Schema(description = "Tổng refund thành công") BigDecimal refundAmount,
        @Schema(description = "Tỷ lệ hoa hồng") BigDecimal commissionRate,
        @Schema(description = "Hoa hồng nền tảng") BigDecimal commissionAmount,
        @Schema(description = "Số tiền voucher giảm giá") BigDecimal voucherDiscount,
        @Schema(description = "Phạm vi voucher áp dụng") com.journeygo.modules.voucher.entity.enums.VoucherScope voucherScope,
        @Schema(description = "Tổng điều chỉnh") BigDecimal adjustmentAmount,
        @Schema(description = "Số tiền ProviderProfile được nhận") BigDecimal providerNetAmount,
        @Schema(description = "Trạng thái khoản doanh thu") ProviderRevenueStatus status
) {
}
