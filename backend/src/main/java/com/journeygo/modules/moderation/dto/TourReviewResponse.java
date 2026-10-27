package com.journeygo.modules.moderation.dto;

import com.journeygo.modules.moderation.entity.enums.TourReviewStatus;
import com.journeygo.modules.tour.dto.TourResponse;

import java.time.Instant;
import java.util.List;

public record TourReviewResponse(Long reviewId, Long tourId, String tourTitle, TourReviewStatus status,
        Long reviewerId, String reviewerName, String decisionNote, String reason, String otherReason,
        Instant submittedAt, Instant reviewedAt, TourResponse tour, List<HistoryItem> history) {
    public record HistoryItem(String action, Long actorId, String actorName, String note,
            String reason, String otherReason, Instant createdAt) {}
}
