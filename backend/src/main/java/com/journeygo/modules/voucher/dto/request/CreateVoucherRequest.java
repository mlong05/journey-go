package com.journeygo.modules.voucher.dto.request;

import com.journeygo.modules.voucher.entity.enums.DiscountType;
import com.journeygo.modules.voucher.entity.enums.VoucherScope;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.LocalDate;

@Builder
public record CreateVoucherRequest(
        @NotBlank(message = "Mã voucher không được để trống")
        @Size(max = 50, message = "Mã voucher tối đa 50 ký tự")
        String code,

        @NotBlank(message = "Tiêu đề voucher không được để trống")
        @Size(max = 150, message = "Tiêu đề voucher tối đa 150 ký tự")
        String title,

        @Size(max = 500, message = "Mô tả tối đa 500 ký tự")
        String description,

        @NotNull(message = "Loại voucher không được để trống")
        VoucherScope voucherScope,

        /** Bắt buộc khi voucherScope == PARTNER */
        Long partnerId,

        @NotNull(message = "Hình thức giảm giá không được để trống")
        DiscountType discountType,

        @NotNull(message = "Giá trị giảm giá không được để trống")
        @DecimalMin(value = "0.01", message = "Giá trị giảm giá phải lớn hơn 0")
        BigDecimal discountValue,

        BigDecimal minOrderAmount,

        /** Bắt buộc khi discountType == PERCENTAGE */
        BigDecimal maxDiscountAmount,

        Integer pointsRequired,

        @NotNull(message = "Tổng số lượng voucher không được để trống")
        Integer totalQuantity,

        Integer validDays,

        LocalDate startDate,

        LocalDate endDate,

        Boolean active
) {}
