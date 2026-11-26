package com.journeygo.modules.tourmerge.dto.response;

import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalTime;

@Builder
public record MergeableOwnSlotResponse(
        Long slotId,
        Long tourId,
        String tourTitle,
        LocalDate departureDate,
        String departureTimeRaw,
        LocalTime parsedDepartureTime,
        String meetingPoint,
        Integer capacity,
        Integer bookedCount
) {
}
