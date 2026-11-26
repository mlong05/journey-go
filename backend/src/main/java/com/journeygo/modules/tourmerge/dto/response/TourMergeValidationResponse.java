package com.journeygo.modules.tourmerge.dto.response;

import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Builder
public record TourMergeValidationResponse(
        boolean valid,
        List<String> errors,
        Long hostSlotId,
        Long guestSlotId,
        LocalDate departureDate,
        LocalTime hostDepartureTime,
        LocalTime guestDepartureTime,
        Integer hostBookedCount,
        Integer guestBookedCount,
        Integer totalBookedCount,
        Integer mergedCapacity,
        List<MatchedPrefixStop> matchedPrefixStops
) {
    @Builder
    public record MatchedPrefixStop(
            int orderIndex,
            String stopName,
            Long destinationId,
            String matchType
    ) {
    }
}
