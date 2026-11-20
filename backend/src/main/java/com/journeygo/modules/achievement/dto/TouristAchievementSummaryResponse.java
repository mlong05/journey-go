package com.journeygo.modules.achievement.dto;

import lombok.Builder;

@Builder
public record TouristAchievementSummaryResponse(
        long totalAchieved,
        long unclaimedCount,
        long totalClaimed,
        long totalPointsEarned
) {
}

