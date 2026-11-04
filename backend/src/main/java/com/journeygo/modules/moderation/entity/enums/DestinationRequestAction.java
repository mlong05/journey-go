package com.journeygo.modules.moderation.entity.enums;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Hành động ghi vết lịch sử xử lý Destination Request")
public enum DestinationRequestAction {
    SUBMITTED,
    START_REVIEW,
    INITIAL_APPROVED,
    INITIAL_REJECTED,
    ASSIGNED,
    START_PROGRESS,
    LINKED_DESTINATION,
    SUBMITTED_CONTENT,
    CONTENT_APPROVED,
    CONTENT_REJECTED,
    CANCELLED
}
