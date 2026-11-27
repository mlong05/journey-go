package com.journeygo.modules.tourfeedback.dto.response;

import java.util.Map;

public record TourRatingSummaryResponse(
        Long tourId,
        long totalReviews,
        double averageRating,
        Double avgGuideRating,
        Double avgCultureRating,
        Double avgScheduleRating,
        Double avgValueRating,
        Map<Integer, Long> starDistribution,
        long photoReviewCount,
        long repliedCount,
        double replyRate
) {
}
