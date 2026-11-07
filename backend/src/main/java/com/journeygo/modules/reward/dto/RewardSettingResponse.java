package com.journeygo.modules.reward.dto;

import com.journeygo.modules.reward.entity.RewardSettingCode;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(description = "Mức điểm thưởng do Admin cấu hình")
public record RewardSettingResponse(
        @Schema(description = "Mã cấu hình") RewardSettingCode code,
        @Schema(description = "Tên hiển thị") String label,
        @Schema(description = "Số điểm") int points,
        @Schema(description = "Admin sửa gần nhất") String updatedByName,
        @Schema(description = "Thời điểm sửa") Instant updatedAt
) {}
