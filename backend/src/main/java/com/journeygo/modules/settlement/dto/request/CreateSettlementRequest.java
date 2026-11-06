package com.journeygo.modules.settlement.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "Yêu cầu tạo đợt tất toán")
public record CreateSettlementRequest(

        @Schema(description = "ID đối tác cần tất toán", example = "1")
        @NotNull(message = "Đối tác không được để trống")
        Long providerProfileId,

        @Schema(description = "Kỳ doanh thu (yyyy-MM) — phải là kỳ đã kết thúc", example = "2026-09")
        @NotNull(message = "Kỳ doanh thu không được để trống")
        String revenuePeriod,

        @Schema(description = "Ghi chú / nội dung đối soát")
        @Size(max = 2000, message = "Ghi chú không được vượt quá 2000 ký tự")
        String note
) {
}
