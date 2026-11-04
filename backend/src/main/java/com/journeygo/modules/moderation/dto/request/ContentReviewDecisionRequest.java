package com.journeygo.modules.moderation.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Quyết định kiểm duyệt chất lượng nội dung lần 2 từ Content Moderator")
public record ContentReviewDecisionRequest(

        @Schema(description = "Ghi chú / Nhận xét của Moderator", example = "Nội dung đạt chuẩn chất lượng, sẵn sàng xuất bản.")
        String note,

        @Schema(description = "Lý do / Hướng dẫn chỉnh sửa gửi cho CP nếu từ chối (trả về IN_PROGRESS)", example = "Cần bổ sung thêm ảnh thực tế và kiểm tra lại lịch mở cửa.")
        String rejectionReason
) {}
