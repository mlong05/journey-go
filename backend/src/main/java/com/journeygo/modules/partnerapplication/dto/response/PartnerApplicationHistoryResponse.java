package com.journeygo.modules.partnerapplication.dto.response;

import com.journeygo.modules.partnerapplication.entity.PartnerApplicationHistory;
import com.journeygo.modules.partnerapplication.entity.enums.PartnerApplicationAction;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(description = "Một bản ghi lịch sử kiểm duyệt đơn đăng ký đối tác")
public record PartnerApplicationHistoryResponse(
        @Schema(description = "ID bản ghi") Long id,
        @Schema(description = "Hành động") PartnerApplicationAction action,
        @Schema(description = "Admin thực hiện") String actorName,
        @Schema(description = "ID admin thực hiện") Long actorId,
        @Schema(description = "Trạng thái trước") String statusBefore,
        @Schema(description = "Trạng thái sau") String statusAfter,
        @Schema(description = "Lý do / ghi chú") String reason,
        @Schema(description = "Thời gian thực hiện") Instant createdAt
) {

    public static PartnerApplicationHistoryResponse fromEntity(PartnerApplicationHistory h) {
        return new PartnerApplicationHistoryResponse(
                h.getId(),
                h.getAction(),
                h.getActor() == null ? null : h.getActor().getFullName(),
                h.getActor() == null ? null : h.getActor().getId(),
                h.getStatusBefore() == null ? null : h.getStatusBefore().name(),
                h.getStatusAfter() == null ? null : h.getStatusAfter().name(),
                h.getReason(),
                h.getCreatedAt()
        );
    }
}
