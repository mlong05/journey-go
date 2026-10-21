package com.journeygo.modules.journey.provider;

import java.math.BigDecimal;
import java.util.List;

public record TourInfo(
        Long tourId,
        String tourName,
        List<TourDestinationInfo> destinations
) {
    public record TourDestinationInfo(
            Long destinationId,
            String destinationName,
            Integer orderIndex,
            Long experienceId,
            BigDecimal latitude,
            BigDecimal longitude,
            Integer radiusMeters,
            String qrToken,
            List<TourTaskInfo> tasks
    ) {}

    public record TourTaskInfo(
            Long taskId,
            String taskName,
            String taskType,
            Integer orderIndex,
            Integer points,
            String correctAnswer
    ) {}
}
