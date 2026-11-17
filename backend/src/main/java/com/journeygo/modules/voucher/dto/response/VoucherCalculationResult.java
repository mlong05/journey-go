package com.journeygo.modules.voucher.dto.response;

import com.journeygo.modules.voucher.entity.enums.VoucherScope;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record VoucherCalculationResult(
        Long voucherId,
        String voucherCode,
        String title,
        VoucherScope voucherScope,
        BigDecimal originalPrice,
        BigDecimal discountAmount,
        BigDecimal finalPrice,
        BigDecimal platformRevenue,
        BigDecimal partnerRevenue,
        boolean valid,
        String errorMessage
) {}
