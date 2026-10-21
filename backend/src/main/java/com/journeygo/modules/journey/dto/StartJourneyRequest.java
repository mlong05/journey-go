package com.journeygo.modules.journey.dto;

import jakarta.validation.constraints.NotNull;

public record StartJourneyRequest(
        Long bookingId,
        @NotNull(message = "tourId không được để trống")
        Long tourId
) {
}
