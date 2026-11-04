package com.journeygo.modules.moderation.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Yêu cầu đối tác (Partner) hủy đề xuất điểm đến")
public record CancelDestinationProposalRequest(

        @Schema(description = "Lý do hủy yêu cầu", example = "Thay đổi kế hoạch hợp tác điểm đến.")
        String reason
) {}
