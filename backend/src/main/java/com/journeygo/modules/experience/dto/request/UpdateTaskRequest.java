package com.journeygo.modules.experience.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

/**
 * Sửa Task — BR-TASK-1: chỉ update được khi status = DRAFT.
 */
@Schema(description = "Yêu cầu cập nhật Task (chỉ DRAFT — BR-TASK-1)")
public record UpdateTaskRequest(

        @Schema(description = "Tiêu đề Task")
        @Size(max = 255)
        String title,

        @Schema(description = "Mô tả Task")
        String description,

        @Schema(description = "Thứ tự hiển thị")
        @Min(0)
        Integer sequenceOrder,

        @Schema(description = "Điểm thưởng")
        @Min(0)
        Integer pointsReward,

        @Schema(description = "Số lần thử tối đa")
        @Min(1)
        Integer maxAttempts,

        @Schema(description = "ID CheckInPoint (nếu task thuộc REAL_WORLD_INTERACTIVE)")
        Long checkInPointId
) {}