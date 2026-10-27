package com.journeygo.modules.moderation.dto;

import com.journeygo.modules.content.dto.CulturalContentResponse;
import com.journeygo.modules.moderation.entity.ContentReviewStatus;
import java.time.Instant;

public record ContentReviewResponse(Long id, Long contentId, Long destinationId, String destinationName,
                                    String title, ContentReviewStatus status, Long reviewerId,
                                    String reviewerName, String decisionNote, String reason, String otherReason, Instant submittedAt,
                                    Instant reviewedAt, CulturalContentResponse content,
                                    java.util.List<HistoryItem> history) {
    public record HistoryItem(String action, Long actorId, String actorName, String note, String reason,
                              String otherReason, Instant createdAt) {}
}
