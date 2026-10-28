package com.journeygo.modules.settlement.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Schema(description = "Yêu cầu từ chối / hủy đợt tất toán")
public record RejectSettlementRequest(

        @Schema(description = "Lý do từ chối (bắt buộc)")
        @NotBlank(message = "Lý do từ chối không được để trống")
        @Size(max = 2000, message = "Lý do từ chối không được vượt quá 2000 ký tự")
        String reason
) {
}
