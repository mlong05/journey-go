package com.journeygo.modules.payment.dto.response;

import com.journeygo.modules.payment.entity.Payment;
import com.journeygo.modules.payment.entity.enums.PaymentMethod;
import com.journeygo.modules.payment.entity.enums.PaymentStatus;
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
        @Schema(description = "Thời điểm thanh toán thành công đã xác minh") Instant paidAt,
        @Schema(description = "URL thanh toán VNPay (dùng để hiển thị QR)") String paymentUrl,
        @Schema(description = "Giao dịch trùng — Booking đã được thanh toán bởi giao dịch khác")
        boolean duplicatePayment,
        @Schema(description = "Số lần IPN đã nhận") int ipnCount,
        @Schema(description = "vnp_ResponseCode") String vnpResponseCode,
        @Schema(description = "vnp_TransactionStatus") String vnpTransactionStatus,
        @Schema(description = "Thông điệp từ VNPay") String vnpMessage,
        @Schema(description = "Ghi chú") String note
) {
    public static PaymentResponse fromEntity(Payment p) {
        if (p == null) return null;
        return PaymentResponse.builder()
                .id(p.getId())
                .bookingId(p.getBooking() != null ? p.getBooking().getId() : null)
                .bookingCode(p.getBooking() != null ? p.getBooking().getBookingCode() : null)
                .txnRef(p.getTxnRef())
                .vnpTransactionNo(p.getVnpTransactionNo())
                .method(p.getMethod())
                .bankCode(p.getBankCode())
                .cardType(p.getCardType())
                .status(p.getStatus())
                .amount(p.getAmount())
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
                .build();
    }
}
