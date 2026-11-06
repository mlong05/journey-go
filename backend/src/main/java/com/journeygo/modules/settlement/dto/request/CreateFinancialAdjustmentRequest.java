package com.journeygo.modules.settlement.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

@Schema(description = "Yêu cầu ghi nhận khoản điều chỉnh tài chính")
public record CreateFinancialAdjustmentRequest(

        @Schema(description = "ID đối tác")
        @NotNull(message = "Đối tác không được để trống")
        Long providerProfileId,

        @Schema(description = "Số tiền điều chỉnh — dương = cộng, âm = trừ")
        @NotNull(message = "Số tiền điều chỉnh không được để trống")
        BigDecimal amount,

        @Schema(description = "Lý do điều chỉnh (bắt buộc — có căn cứ tài chính)", example = "Hoàn tiền thành công sau khi đã tất toán")
        @NotBlank(message = "Lý do điều chỉnh không được để trống")
        @Size(max = 2000, message = "Lý do không được vượt quá 2000 ký tự")
        String reason,

        @Schema(description = "ID Refund gốc gây ra khoản điều chỉnh (nếu có)")
        Long refundRequestId,

        @Schema(description = "ID Settlement gốc (nếu điều chỉnh phát sinh sau khi tất toán)")
        Long sourceSettlementId
) {
}
