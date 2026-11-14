package com.journeygo.modules.voucher.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record ValidateVoucherRequest(
        @NotBlank(message = "Mã voucher không được để trống")
        String voucherCode,

        @NotNull(message = "Tổng tiền tour không được để trống")
        @DecimalMin(value = "0.00", message = "Tổng tiền tour không được âm")
        BigDecimal tourPrice,

        /** ID đối tác tổ chức tour */
        @NotNull(message = "ID đối tác không được để trống")
        Long partnerId,

        /** Tỷ lệ hoa hồng của nền tảng (ví dụ: 0.20 tương đương 20%) */
        @NotNull(message = "Tỷ lệ hoa hồng không được để trống")
        BigDecimal commissionRate
) {}
