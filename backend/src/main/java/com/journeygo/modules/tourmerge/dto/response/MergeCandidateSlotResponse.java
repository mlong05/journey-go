package com.journeygo.modules.tourmerge.dto.response;

import com.journeygo.modules.tourmerge.dto.response.TourMergeValidationResponse.MatchedPrefixStop;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Builder
public record MergeCandidateSlotResponse(
        Long slotId,
        Long tourId,
        String tourTitle,
        Long providerId,
        String providerName,
        boolean sameProvider,
        LocalDate departureDate,
        String departureTimeRaw,
        LocalTime parsedDepartureTime,
        String meetingPoint,
        Integer capacity,
        Integer bookedCount,
        long timeDiffMinutes,
        List<MatchedPrefixStop> matchedPrefixStops
) {
}
