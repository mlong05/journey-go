package com.journeygo.modules.journey.dto;

import com.journeygo.modules.journey.JourneyRules;
import com.journeygo.modules.journey.entity.Journey;
import com.journeygo.modules.journey.entity.enums.JourneyStatus;
import lombok.Builder;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

@Builder
public record JourneyResponse(
        Long id,
        Long userId,
        Long bookingId,
        Long tourId,
        String tourName,
        JourneyStatus status,
        Integer currentDestinationOrder,
        Integer totalDestinations,
        Instant startedAt,
        Instant completedAt,
        Instant createdAt,
        // Quy tắc để app hiển thị đúng như backend chấm (không chép cứng trong app)
        Integer checkInRadiusMeters,
        Integer completionBonusPoints,
        List<JourneyDestinationProgressResponse> destinations
) {
    public static JourneyResponse fromEntity(Journey entity) {
        List<JourneyDestinationProgressResponse> destList = entity.getDestinations() != null
                ? entity.getDestinations().stream().map(JourneyDestinationProgressResponse::fromEntity).toList()
                : Collections.emptyList();

        return JourneyResponse.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .bookingId(entity.getBookingId())
                .tourId(entity.getTourId())
                .tourName(entity.getTourName())
                .status(entity.getStatus())
                .currentDestinationOrder(entity.getCurrentDestinationOrder())
                .totalDestinations(entity.getTotalDestinations())
                .startedAt(entity.getStartedAt())
                .completedAt(entity.getCompletedAt())
                .createdAt(entity.getCreatedAt())
                .checkInRadiusMeters(JourneyRules.DEFAULT_CHECK_IN_RADIUS_METERS)
                .completionBonusPoints(JourneyRules.COMPLETION_BONUS_POINTS)
                .destinations(destList)
                .build();
    }
}
