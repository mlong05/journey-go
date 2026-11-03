package com.journeygo.modules.journey.dto;

import lombok.Builder;

import java.time.Instant;

@Builder
public record CheckInResultResponse(
        Long journeyId,
        Long destinationId,
        boolean success,
        String message,
        Integer distanceMeters,
        boolean badgeAwarded,
        Long badgeId,
        String badgeName,
        String badgeIconUrl,
        Instant checkedInAt,
        /** true khi điểm đến đã được check-in từ trước: không check-in lại, chỉ báo cho du khách */
        boolean alreadyCheckedIn
) {
}
