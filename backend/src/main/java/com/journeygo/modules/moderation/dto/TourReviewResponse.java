package com.journeygo.modules.moderation.dto;

import com.journeygo.modules.moderation.entity.enums.TourReviewStatus;
import com.journeygo.modules.tour.dto.TourResponse;

import java.time.Instant;
import java.util.List;

public record TourReviewResponse(Long reviewId, Long tourId, String tourTitle, TourReviewStatus status,
        Long reviewerId, String reviewerName, String decisionNote, String reason, String otherReason,
        Instant submittedAt, Instant reviewedAt, TourResponse tour, List<HistoryItem> history,
        Integer tourVersion, Criteria criteria, List<Note> notes, boolean wizardTour) {

    /**
     * Lịch sử kiểm duyệt (mục 9.5): người thực hiện, thời gian, trạng thái trước/sau,
     * lý do / ghi chú, phiên bản tour.
     */
    public record HistoryItem(String action, Long actorId, String actorName, String note,
            String reason, String otherReason, Instant createdAt,
            String fromStatus, String toStatus, Integer tourVersion) {}

    /** 5 tiêu chí Moderator đã tick (null nếu chưa đánh giá). */
    public record Criteria(Boolean interactive, Boolean localExpertise, Boolean storytelling,
            Boolean culturalRatio, Boolean authenticMedia, int passedCount) {}

    public record Note(Long id, String step, Long stopId, String field, String note, Instant createdAt) {}
}
