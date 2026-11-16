package com.journeygo.modules.voucher.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Builder;

import java.math.BigDecimal;

@Builder
@Schema(description = "Yêu cầu kiểm tra & áp dụng mã voucher của người dùng")
public record ValidateUserVoucherRequest(
        @Schema(description = "Mã voucher quy đổi của người dùng (ví dụ: VOUCHER-ABCD12)", example = "VOUCHER-ABCD12")
        @NotBlank(message = "Mã voucher không được để trống")
        String userVoucherCode,

        @Schema(description = "Giá tour trước giảm", example = "5000000")
        @NotNull(message = "Tổng tiền tour không được để trống")
        @DecimalMin(value = "0.00", message = "Tổng tiền tour không được âm")
        BigDecimal tourPrice,

        @Schema(description = "ID đối tác tổ chức tour (nếu có)")
        Long partnerId
) {}
