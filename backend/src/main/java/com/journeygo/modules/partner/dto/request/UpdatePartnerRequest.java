package com.journeygo.modules.partner.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

@Schema(description = "Yêu cầu cập nhật thông tin đối tác")
public record UpdatePartnerRequest(

        @Schema(description = "Tên hiển thị của đối tác")
        @Size(max = 150, message = "Tên đối tác không được vượt quá 150 ký tự")
        String partnerName,

        @Schema(description = "Tỷ lệ hoa hồng nền tảng áp dụng (0.20 = 20%)")
        @DecimalMin(value = "0.0", message = "Tỷ lệ hoa hồng không được âm")
        @DecimalMax(value = "1.0", message = "Tỷ lệ hoa hồng không được vượt quá 1.0")
        BigDecimal commissionRate,

        @Schema(description = "Đối tác còn hoạt động hay không")
        Boolean active
) {}
