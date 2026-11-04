package com.journeygo.modules.moderation.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Quyết định phê duyệt nội dung và xuất bản điểm đến từ Content Moderator")
public record ContentApproveDecisionRequest(

        @Schema(description = "Ghi chú phê duyệt của Moderator (không bắt buộc)", example = "Nội dung đạt chuẩn chất lượng, sẵn sàng xuất bản.")
        String note
) {}
