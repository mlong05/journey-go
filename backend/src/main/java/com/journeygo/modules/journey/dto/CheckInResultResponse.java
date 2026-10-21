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
        Instant checkedInAt
) {
}
