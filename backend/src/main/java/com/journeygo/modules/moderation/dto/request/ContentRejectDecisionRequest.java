package com.journeygo.modules.moderation.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;

@Schema(description = "Quyết định từ chối nội dung lần 2 từ Content Moderator (yêu cầu CP chỉnh sửa)")
public record ContentRejectDecisionRequest(

        @Schema(description = "Lý do từ chối / điểm cần chỉnh sửa", example = "Cần bổ sung thêm ảnh thực tế và kiểm tra lại lịch mở cửa.")
        @NotBlank(message = "Lý do từ chối không được để trống")
        String rejectionReason,

        @Schema(description = "Ghi chú / hướng dẫn chi tiết thêm cho Content Provider", example = "Xem lại mục giờ mở cửa vào ngày lễ.")
        String note
) {}
