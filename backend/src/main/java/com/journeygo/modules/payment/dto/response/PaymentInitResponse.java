package com.journeygo.modules.payment.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;

@Builder
@Schema(description = "Kết quả khởi tạo thanh toán — trả về URL/QR cho khách quét")
public record PaymentInitResponse(

        @Schema(description = "ID payment attempt") Long paymentId,
        @Schema(description = "ID booking") Long bookingId,
        @Schema(description = "Mã đơn") String bookingCode,
        @Schema(description = "Mã tham chiếu giao dịch") String txnRef,
        @Schema(description = "Số tiền (VND)") BigDecimal amount,
        @Schema(description = "Loại tiền") String currency,
        @Schema(description = "URL thanh toán VNPay — dùng để hiển thị QR hoặc chuyển hướng")
        String paymentUrl,
        @Schema(description = "Hạn thanh toán") Instant expiresAt,

        @Schema(description = "Phương thức thanh toán khách đã chọn (null = khách tự chọn trên trang VNPay)")
        String selectedBankCode,
        @Schema(description = "Các phương thức thanh toán khách có thể chọn — 3 nhóm: "
                + "Ứng dụng Ngân hàng & Ví điện tử / Thẻ nội địa & tài khoản ngân hàng / "
                + "Thẻ thanh toán quốc tế")
        List<PaymentMethodResponse.MethodOption> availableMethods,

        @Schema(description = "Thông báo hướng dẫn hiển thị cho khách")
        String message
) {
}
