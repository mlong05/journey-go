package com.journeygo.modules.achievement.event;

public record PointsEarnedEvent(
        Long userId,
        int lifetimeEarned
) {
}

