package com.journeygo.modules.refund.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

@Schema(description = "Admin cập nhật nhóm lý do hoàn tiền")
public record UpdateRefundReasonGroupRequest(

        @Schema(description = "Tên hiển thị tiếng Việt (bắt buộc)")
        @NotBlank(message = "Tên nhóm lý do không được để trống")
        @Size(max = 150, message = "Tên nhóm lý do không được vượt quá 150 ký tự")
        String name,

        @Schema(description = "Tỷ lệ hoàn tiền: 0.50 = 50%, 1.00 = 100%, 0.00 = không hoàn")
        @DecimalMin(value = "0.0", message = "Tỷ lệ hoàn không được nhỏ hơn 0")
        @DecimalMax(value = "1.0", message = "Tỷ lệ hoàn không được lớn hơn 1")
        BigDecimal refundRate,

        @Schema(description = "Mô tả điều kiện áp dụng — hiển thị cho Tourist")
        @Size(max = 2000, message = "Mô tả không được vượt quá 2000 ký tự")
        String description,

        @Schema(description = "Thứ tự hiển thị")
        Integer displayOrder,

        @Schema(description = "true = đang bật")
        Boolean active
) {}
