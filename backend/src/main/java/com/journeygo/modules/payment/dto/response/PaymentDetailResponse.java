package com.journeygo.modules.payment.dto.response;

import com.journeygo.modules.booking.dto.response.BookingResponse;
import com.journeygo.modules.refund.dto.response.RefundResponse;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.util.List;

/**
 * Chi tiết GIAO DỊCH + ĐƠN đặt tour — gộp lại cho một modal.
 *
 * <p>Trước đây trang "Tài chính &amp; Thanh toán" có 2 tab riêng: "Giao dịch" và
 * "Đơn đặt tour" ⇒ phải chuyển qua lại để đối chiếu một đơn với các giao dịch
 * của nó. Nay gộp: bấm "Chi tiết" là xem được ĐỒNG THỜI:
 * <ul>
 *   <li>Thông tin giao dịch (mã GD, phương thức, trạng thái, kết quả VNPay…).</li>
 *   <li>Thông tin đơn đặt tour (mã đơn, khách, tour, hạn thanh toán…).</li>
 *   <li><b>Chi tiết dòng tiền</b> — giá gốc → voucher → số tiền thực trả → đã hoàn → thực thu.</li>
 *   <li>Các yêu cầu hoàn tiền (nếu có) của giao dịch này.</li>
 * </ul>
 */
@Builder
@Schema(description = "Chi tiết giao dịch + đơn đặt tour (ADMIN)")
public record PaymentDetailResponse(

        @Schema(description = "Thông tin giao dịch thanh toán") PaymentResponse payment,

        @Schema(description = "Thông tin đơn đặt tour liên quan") BookingResponse booking,

        @Schema(description = "Các lần thử thanh toán khác của cùng đơn (để đối chiếu trùng lặp)")
        List<PaymentResponse> siblingPayments,

        @Schema(description = "Các yêu cầu hoàn tiền của giao dịch này") List<RefundResponse> refunds,

        @Schema(description = "Chi tiết dòng tiền của giao dịch") CashFlow cashFlow
) {

    /**
     * Bảng kê dòng tiền của một giao dịch.
     *
     * <p>⚠️ {@code netAmount} chỉ có giá trị khi giao dịch ĐÃ THÀNH CÔNG — xem
     * {@link PaymentResponse#netAmount()}.
     *
     * @param originalAmount giá gốc của đơn (trước khi áp voucher)
     * @param discountAmount số tiền voucher giảm (0 nếu không áp voucher)
     * @param voucherCode    mã voucher đã áp dụng (null nếu không áp)
     * @param voucherScope   phạm vi voucher (PLATFORM / PARTNER)
     * @param paidAmount     số tiền khách thực trả (sau voucher)
     * @param refundedAmount tổng số tiền đã hoàn trả cho khách
     * @param netAmount      thực thu = paidAmount − refundedAmount (0 nếu chưa thành công)
     */
    @Builder
    @Schema(description = "Chi tiết dòng tiền của giao dịch")
    public record CashFlow(
            @Schema(description = "Giá gốc ban đầu") BigDecimal originalAmount,
            @Schema(description = "Số tiền voucher giảm") BigDecimal discountAmount,
            @Schema(description = "Mã voucher đã áp dụng") String voucherCode,
            @Schema(description = "Phạm vi voucher") String voucherScope,
            @Schema(description = "Số tiền khách thực trả") BigDecimal paidAmount,
            @Schema(description = "Tổng số tiền đã hoàn") BigDecimal refundedAmount,
            @Schema(description = "Thực thu = số tiền thực trả − đã hoàn") BigDecimal netAmount
    ) {
    }
}
