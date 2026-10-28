package com.journeygo.modules.payment.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

/**
 * Một ngân hàng / phương thức thanh toán trong danh sách chính thức của VNPay.
 *
 * <p>Nguồn: API {@code POST /qrpayauth/api/merchant/get_bank_list} của VNPay.
 */
@Builder
@Schema(description = "Ngân hàng / phương thức thanh toán do VNPay hỗ trợ")
public record VnPayBank(

        @Schema(description = "Mã ngân hàng — dùng làm vnp_BankCode") String bankCode,
        @Schema(description = "Tên ngân hàng / ứng dụng") String bankName,
        @Schema(description = "URL logo") String logoLink,
        @Schema(description = "Loại ngân hàng (mã số theo VNPay)") Integer bankType,
        @Schema(description = "Thứ tự hiển thị") Integer displayOrder
) {
}
