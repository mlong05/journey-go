package com.journeygo.modules.moderation.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Yêu cầu Admin phân công Content Provider (CP)")
public record AssignCpRequest(

        @Schema(description = "ID của User có vai trò Content Provider (PROVIDER)", example = "5")
        @NotNull(message = "ID Content Provider không được để trống")
        Long cpUserId,

        @Schema(description = "Chỉ đạo / Ghi chú phân công", example = "Giao cho bạn A phụ trách khu vực Huế, hạn hoàn thành trong 7 ngày.")
        String note
) {}
