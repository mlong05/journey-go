package com.journeygo.modules.refund.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.Instant;

@Schema(description = "Xác nhận đã chuyển khoản thủ công và ghi nhận bằng chứng")
public record ManualTransferRequest(

        @Schema(description = "Mã tham chiếu giao dịch chuyển khoản")
        @NotBlank(message = "Mã tham chiếu giao dịch không được để trống")
        @Size(max = 100, message = "Mã tham chiếu không được vượt quá 100 ký tự")
        String transferReference,

        @Schema(description = "Bằng chứng chuyển khoản (URL ảnh hoặc mô tả)")
        @Size(max = 5000, message = "Bằng chứng không được vượt quá 5000 ký tự")
        String transferEvidence,

        @Schema(description = "Thời điểm thực hiện chuyển khoản")
        Instant transferredAt
) {}
