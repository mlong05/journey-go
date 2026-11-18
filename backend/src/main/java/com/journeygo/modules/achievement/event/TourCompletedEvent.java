package com.journeygo.modules.achievement.event;

import java.util.List;

public record TourCompletedEvent(
        Long userId,
        Long journeyId,
        Long tourId,
        List<Long> destinationIds
) {
}

