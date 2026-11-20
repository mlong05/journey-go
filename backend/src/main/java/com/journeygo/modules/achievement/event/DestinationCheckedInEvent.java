package com.journeygo.modules.achievement.event;

import java.time.Instant;

public record DestinationCheckedInEvent(
        Long userId,
        Long destinationId,
        Long journeyId,
        Instant checkedInAt,
        boolean isEarlyBird,
        boolean hasSpecialExperience
) {
}

