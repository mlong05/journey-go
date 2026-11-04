package com.journeygo.modules.moderation.dto.response;

import com.journeygo.modules.moderation.entity.DestinationRequestHistory;
import com.journeygo.modules.moderation.entity.enums.DestinationRequestAction;
import com.journeygo.modules.moderation.entity.enums.DestinationRequestStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.time.Instant;

@Schema(description = "Thông tin một bản ghi lịch sử xử lý Destination Request")
@Builder
public record DestinationRequestHistoryResponse(
        Long id,
        Long actorId,
        String actorName,
        String actorRole,
        DestinationRequestAction action,
        DestinationRequestStatus fromStatus,
        DestinationRequestStatus toStatus,
        String note,
        String reason,
        Instant createdAt
) {
    public static DestinationRequestHistoryResponse fromEntity(DestinationRequestHistory history) {
        if (history == null) return null;
        var actor = history.getActor();
        return DestinationRequestHistoryResponse.builder()
                .id(history.getId())
                .actorId(actor != null ? actor.getId() : null)
                .actorName(actor != null ? actor.getFullName() : null)
                .actorRole(actor != null && actor.getRole() != null ? actor.getRole().getName() : null)
                .action(history.getAction())
                .fromStatus(history.getFromStatus())
                .toStatus(history.getToStatus())
                .note(history.getNote())
                .reason(history.getReason())
                .createdAt(history.getCreatedAt())
                .build();
    }
}
