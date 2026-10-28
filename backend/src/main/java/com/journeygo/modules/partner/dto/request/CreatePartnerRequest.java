package com.journeygo.modules.partner.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

@Schema(description = "Yêu cầu tạo đối tác (Partner) kèm Wallet")
public record CreatePartnerRequest(

        @Schema(description = "ID User được cấp vai trò PARTNER", example = "12")
        @NotNull(message = "User không được để trống")
        @PositiveOrZero(message = "User không hợp lệ")
        Long userId,

        @Schema(description = "Tên hiển thị của đối tác", example = "Ban Quản lý Tràng An")
        @Size(max = 150, message = "Tên đối tác không được vượt quá 150 ký tự")
        String partnerName,

        @Schema(description = "Tỷ lệ hoa hồng nền tảng áp dụng (0.20 = 20%)", example = "0.2000")
        @DecimalMin(value = "0.0", message = "Tỷ lệ hoa hồng không được âm")
        @DecimalMax(value = "1.0", message = "Tỷ lệ hoa hồng không được vượt quá 1.0")
        BigDecimal commissionRate
) {}
