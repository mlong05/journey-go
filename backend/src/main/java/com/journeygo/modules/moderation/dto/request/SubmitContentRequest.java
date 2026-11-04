package com.journeygo.modules.moderation.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Yêu cầu Content Provider nộp nội dung Destination hoàn chỉnh để duyệt lần 2")
public record SubmitContentRequest(

        @Schema(description = "ID của Destination đã tạo trên hệ thống", example = "12")
        @NotNull(message = "ID điểm đến không được để trống")
        Long destinationId,

        @Schema(description = "Ghi chú nộp nội dung của CP", example = "Đã hoàn thành nội dung văn hóa, hình ảnh và tọa độ chính xác.")
        String note
) {}
