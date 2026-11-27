package com.journeygo.modules.tourfeedback.dto.response;

import java.util.Map;

public record ProviderReviewSummaryResponse(
        long totalReviews,
        double averageRating,
        long unrepliedCount,
        Double avgGuideRating,
        Double avgCultureRating,
        Double avgScheduleRating,
        Double avgValueRating,
        Map<Integer, Long> starDistribution
) {
}
