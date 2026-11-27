package com.journeygo.modules.tourfeedback.dto.response;

public record TourReviewEligibilityResponse(
        Long bookingId,
        Long tourId,
        boolean eligible,
        String reasonCode,
        String reasonMessage,
        TourCustomerReviewResponse existingReview
) {
}
