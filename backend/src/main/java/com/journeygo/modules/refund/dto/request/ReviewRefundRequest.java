package com.journeygo.modules.refund.dto.request;

import com.journeygo.modules.refund.entity.enums.RefundMethod;
import com.journeygo.modules.refund.entity.enums.RefundReason;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;

@Schema(description = "Yêu cầu Admin phê duyệt / từ chối refund")
public record ReviewRefundRequest(

        @Schema(description = "Quyết định: true = phê duyệt, false = từ chối")
        @NotNull(message = "Quyết định không được để trống")
        Boolean approve,

        @Schema(description = "Nguyên nhân do Admin xác định — quyết định tỷ lệ hoàn 50%/100%")
        RefundReason reason,

        @Schema(description = "Số tiền được duyệt (Admin chỉ có thể điều chỉnh trong phạm vi chính sách)")
        BigDecimal amount,

        @Schema(description = "Phương thức hoàn tiền: VNPAY_API (chính) hoặc MANUAL_BANK_TRANSFER (dự phòng)")
        RefundMethod method,

        @Schema(description = "Lý do từ chối (bắt buộc khi từ chối)")
        @Size(max = 2000, message = "Lý do từ chối không được vượt quá 2000 ký tự")
        String rejectionReason,

        @Schema(description = "Ghi chú thêm")
        @Size(max = 2000, message = "Ghi chú không được vượt quá 2000 ký tự")
        String note
) {}
