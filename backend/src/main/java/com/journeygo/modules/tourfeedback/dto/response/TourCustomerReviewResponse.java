package com.journeygo.modules.tourfeedback.dto.response;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

public record TourCustomerReviewResponse(
        Long id,
        Long bookingId,
        String bookingCode,
        Long tourId,
        String tourTitle,
        String tourCoverImageUrl,
        Long reviewerId,
        String reviewerName,
        String reviewerAvatarUrl,
        Integer overallRating,
        Integer guideRating,
        Integer cultureRating,
        Integer scheduleRating,
        Integer valueRating,
        String title,
        String comment,
        List<String> imageUrls,
        boolean verifiedPurchase,
        LocalDate experienceDate,
        String providerReply,
        String providerRepliedByName,
        Instant providerRepliedAt,
        boolean hidden,
        String hiddenReason,
        Instant hiddenAt,
        boolean canEdit,
        Instant editedAt,
        Instant createdAt,
        Instant updatedAt
) {
}
