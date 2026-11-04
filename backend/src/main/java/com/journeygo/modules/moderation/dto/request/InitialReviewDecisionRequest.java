package com.journeygo.modules.moderation.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Quyết định thẩm định sơ bộ lần 1 từ Content Moderator")
public record InitialReviewDecisionRequest(

        @Schema(description = "Ghi chú / Nhận xét của Moderator", example = "Điểm đến phù hợp định hướng du lịch văn hóa.")
        String note,

        @Schema(description = "Mã hoặc lý do từ chối (khi REJECT)", example = "THONG_TIN_CHUA_DAY_DU")
        String reason
) {}
