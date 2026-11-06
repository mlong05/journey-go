package com.journeygo.modules.moderation.dto;

import com.journeygo.modules.destination.dto.DestinationResponse;
import com.journeygo.modules.moderation.entity.enums.DestinationReviewStatus;

import java.time.Instant;
import java.util.List;

public record DestinationReviewResponse(Long reviewId, Long destinationId, String destinationName,
        DestinationReviewStatus status, Long reviewerId, String reviewerName, String decisionNote,
        String reason, String otherReason, Instant submittedAt, Instant reviewedAt,
        DestinationResponse destination, List<HistoryItem> history) {
    public record HistoryItem(String action, Long actorId, String actorName, String note,
            String reason, String otherReason, Instant createdAt) {}
}
