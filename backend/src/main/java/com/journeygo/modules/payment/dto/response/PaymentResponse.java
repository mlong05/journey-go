package com.journeygo.modules.payment.dto.response;

import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.payment.entity.Payment;
import com.journeygo.modules.payment.entity.enums.PaymentMethod;
import com.journeygo.modules.payment.entity.enums.PaymentStatus;
import com.journeygo.modules.voucher.entity.enums.VoucherScope;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

@Builder
@Schema(description = "Thông tin giao dịch thanh toán")
public record PaymentResponse(

        @Schema(description = "ID payment") Long id,
        @Schema(description = "ID booking") Long bookingId,
        @Schema(description = "Mã đơn") String bookingCode,
        @Schema(description = "Mã tham chiếu giao dịch (vnp_TxnRef)") String txnRef,
        @Schema(description = "Mã giao dịch VNPay") String vnpTransactionNo,
        @Schema(description = "Phương thức thanh toán") PaymentMethod method,
        @Schema(description = "Mã ngân hàng / ví thực tế (vnp_BankCode)") String bankCode,
        @Schema(description = "Loại thẻ / phương thức thực tế (vnp_CardType) — ATM = thẻ nội địa & tài khoản "
                + "ngân hàng, QRCODE = ứng dụng ngân hàng & ví điện tử (VNPay chỉ có 2 giá trị này)")
        String cardType,
        @Schema(description = "Trạng thái thanh toán") PaymentStatus status,
        @Schema(description = "Số tiền (VND)") BigDecimal amount,
        @Schema(description = "Loại tiền") String currency,
        @Schema(description = "Thời điểm tạo") Instant createdAt,
        @Schema(description = "Hạn thanh toán") Instant expiresAt,
        @Schema(description = "Thời điểm thanh toán thành công đã được xác minh") Instant paidAt,
        @Schema(description = "URL thanh toán VNPay (dùng để hiển thị QR)") String paymentUrl,
        @Schema(description = "Giao dịch trùng — Booking đã được thanh toán bởi giao dịch khác")
        boolean duplicatePayment,
        @Schema(description = "Số lần IPN nhận") int ipnCount,
        @Schema(description = "vnp_ResponseCode") String vnpResponseCode,
        @Schema(description = "vnp_TransactionStatus") String vnpTransactionStatus,
        @Schema(description = "Thông điệp từ VNPay") String vnpMessage,
        @Schema(description = "Ghi chú") String note,

        // ── Chi tiết dòng tiền ───────────────────────────────────────────────
        // Phục vụ cột "Chi tiết dòng tiền" của bảng Nhật ký giao dịch toàn sàn.
        //
        // Công thức: giá gốc − voucher = số tiền khách trả (amount);
        //            số tiền khách trả − đã hoàn = thực thu.
        @Schema(description = "Giá gốc trước khi áp voucher (giá trị ban đầu của đơn)")
        BigDecimal originalAmount,

        @Schema(description = "Số tiền giảm do voucher") BigDecimal discountAmount,

        @Schema(description = "Mã voucher đã áp dụng") String voucherCode,

        @Schema(description = "Phạm vi voucher đã áp dụng") VoucherScope voucherScope,

        @Schema(description = "Tổng số tiền đã hoàn trả cho khách (yêu cầu ở trạng thái REFUNDED)")
        BigDecimal refundedAmount,

        @Schema(description = "Thực thu = số tiền thanh toán − số tiền đã hoàn. "
                + "BẰNG 0 nếu giao dịch chưa thành công (chưa/chưa thanh toán, thất bại, "
                + "đã hủy, hết hạn, bị thay thế) — vì không có dòng tiền nào thu được.")
        BigDecimal netAmount
) {
    public static PaymentResponse fromEntity(Payment p) {
        return fromEntity(p, null);
    }

    /**
     * Mapping kèm số tiền đã hoàn.
     *
     * @param refundedAmount tổng tiền đã hoàn của giao dịch này (null = chưa có
     *                       yêu cầu hoàn nào hoàn tất ⇒ coi như 0).
     */
    public static PaymentResponse fromEntity(Payment p, BigDecimal refundedAmount) {
        if (p == null) return null;

        Booking booking = p.getBooking();
        BigDecimal amount = p.getAmount() != null ? p.getAmount() : BigDecimal.ZERO;
        BigDecimal discount = booking != null && booking.getDiscountAmount() != null
                ? booking.getDiscountAmount()
                : BigDecimal.ZERO;
        BigDecimal refunded = refundedAmount != null ? refundedAmount : BigDecimal.ZERO;

        // Giá gốc = số tiền khách thực trả + phần voucher đã giảm.
        BigDecimal original = amount.add(discount);

        // ⚠️ THỰC THU chỉ có nghĩa khi giao dịch ĐÃ THÀNH CÔNG.
        //
        // Giao dịch ở trạng thái khác (PENDING/PROCESSING = chưa biết kết quả,
        // FAILED/CANCELLED/EXPIRED = không thành công, SUPERSEDED = bị giao dịch
        // khác thay thế) ⇒ KHÔNG có đồng tiền nào chảy vào sàn ⇒ thực thu = 0.
        //
        // Nếu không kiểm tra trạng thái, một đơn "Đã hủy" 450.000 ₫ vẫn hiện
        // "Thực thu 450.000 ₫" ⇒ số liệu doanh thu trên bảng sai hoàn toàn.
        BigDecimal net = p.getStatus() == PaymentStatus.SUCCESS
                ? amount.subtract(refunded)
                : BigDecimal.ZERO;

        return PaymentResponse.builder()
                .id(p.getId())
                .bookingId(booking != null ? booking.getId() : null)
                .bookingCode(booking != null ? booking.getBookingCode() : null)
                .txnRef(p.getTxnRef())
                .vnpTransactionNo(p.getVnpTransactionNo())
                .method(p.getMethod())
                .bankCode(p.getBankCode())
                .cardType(p.getCardType())
                .status(p.getStatus())
                .amount(amount)
                .currency(p.getCurrency())
                .createdAt(p.getCreatedAt())
                .expiresAt(p.getExpiresAt())
                .paidAt(p.getPaidAt())
                .paymentUrl(p.getPaymentUrl())
                .duplicatePayment(p.isDuplicatePayment())
                .ipnCount(p.getIpnCount())
                .vnpResponseCode(p.getVnpResponseCode())
                .vnpTransactionStatus(p.getVnpTransactionStatus())
                .vnpMessage(p.getVnpMessage())
                .note(p.getNote())
                .originalAmount(original)
                .discountAmount(discount)
                .voucherCode(booking != null ? booking.getAppliedVoucherCode() : null)
                .voucherScope(booking != null ? booking.getVoucherScope() : null)
                .refundedAmount(refunded)
                .netAmount(net)
                .build();
    }
}
