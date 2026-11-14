package com.journeygo.modules.partnerprofileupdate.dto.response;

import com.journeygo.modules.partnerprofileupdate.entity.PartnerProfileUpdateHistory;
import com.journeygo.modules.partnerprofileupdate.entity.enums.PartnerProfileUpdateAction;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

@Schema(description = "Một bản ghi lịch sử thay đổi thông tin đối tác")
public record PartnerProfileUpdateHistoryResponse(
        @Schema(description = "ID bản ghi") Long id,
        @Schema(description = "ID yêu cầu chứa bản ghi này") Long requestId,
        @Schema(description = "Hành động") PartnerProfileUpdateAction action,
        @Schema(description = "Người thực hiện") String actorName,
        @Schema(description = "ID người thực hiện") Long actorId,
        @Schema(description = "Trạng thái trước") String statusBefore,
        @Schema(description = "Trạng thái sau") String statusAfter,
        @Schema(description = "Lý do / ghi chú") String reason,
        @Schema(description = "Thời gian thực hiện") Instant createdAt
) {

    public static PartnerProfileUpdateHistoryResponse fromEntity(PartnerProfileUpdateHistory h) {
        return new PartnerProfileUpdateHistoryResponse(
                h.getId(),
                h.getRequest() == null ? null : h.getRequest().getId(),
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
