package com.journeygo.modules.achievement.event;

public record TaskCompletedEvent(
        Long userId,
        Long journeyId,
        String taskType,
        boolean isSuccess,
        boolean isPerfectScore,
        double scorePercentage,
        boolean hasSpecialReward
) {
}

