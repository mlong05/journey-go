package com.journeygo.modules.tourmerge.dto.response;

import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.tourmerge.entity.enums.TourMergeStatus;
import lombok.Builder;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

@Builder
public record MergedPassengerManifestResponse(
        Long mergeId,
        TourMergeStatus status,
        LocalDate departureDate,
        LocalTime mergedDepartureTime,
        String mergedMeetingPoint,
        Integer mergedCapacity,
        int totalPassengers,
        int totalSeatsOccupied,
        List<MergedPassengerItem> passengers
) {
    @Builder
    public record MergedPassengerItem(
            Long passengerId,
            String bookingCode,
            Long slotId,
            String slotRole,
            Long originalTourId,
            String originalTourName,
            Long providerId,
            String providerName,
            String fullName,
            LocalDate birthDate,
            String gender,
            String email,
            GuestType guestType,
            boolean countsTowardSlot,
            boolean bookingCustomer
    ) {
    }
}
