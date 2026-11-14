package com.journeygo.modules.voucher.dto.request;

import com.journeygo.modules.voucher.entity.enums.DiscountType;
import com.journeygo.modules.voucher.entity.enums.VoucherScope;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Builder
public record UpdateVoucherRequest(
        @Size(max = 150, message = "Tiêu đề voucher tối đa 150 ký tự")
        String title,

        @Size(max = 500, message = "Mô tả tối đa 500 ký tự")
        String description,

        VoucherScope voucherScope,

        Long partnerId,

        DiscountType discountType,

        @DecimalMin(value = "0.01", message = "Giá trị giảm giá phải lớn hơn 0")
        BigDecimal discountValue,

        BigDecimal minOrderAmount,

        BigDecimal maxDiscountAmount,

        Integer pointsRequired,

        Integer totalQuantity,

        Integer validDays,

        LocalDate startDate,

        LocalDate endDate,

        Boolean active
) {}
