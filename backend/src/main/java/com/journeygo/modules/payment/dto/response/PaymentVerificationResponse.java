package com.journeygo.modules.payment.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
@Schema(description = "Kết quả xác minh/thanh toán trả về cho người dùng")
public record PaymentVerificationResponse(

        @Schema(description = "Trạng thái thanh toán cuối cùng") String status,
        @Schema(description = "Mã tham chiếu giao dịch") String txnRef,
        @Schema(description = "Số tiền (VND)") BigDecimal amount,
        @Schema(description = "Mã giao dịch VNPay") String vnpTransactionNo,
        @Schema(description = "Trạng thái booking sau khi xử lý") String bookingStatus,
        @Schema(description = "Thông điệp") String message
) {}
