package com.journeygo.modules.settlement.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

@Schema(description = "Yêu cầu tạo đợt tất toán")
public record CreateSettlementRequest(

        @Schema(description = "ID đối tác cần tất toán", example = "1")
        @NotNull(message = "Đối tác không được để trống")
        Long providerProfileId,

        @Schema(description = "Kỳ doanh thu — chu kỳ 10 ngày (yyyy-MM-D), phải là kỳ đã kết thúc. "
                + "VD: 2026-10-1 = 01/10 → 10/10/2026, 2026-10-2 = 11/10 → 20/10/2026, "
                + "2026-10-3 = 21/10 → 31/10/2026", example = "2026-10-1")
        @NotNull(message = "Kỳ doanh thu không được để trống")
        String revenuePeriod,

        @Schema(description = "Ghi chú / nội dung đối soát")
        @Size(max = 2000, message = "Ghi chú không được vượt quá 2000 ký tự")
        String note
) {
}
