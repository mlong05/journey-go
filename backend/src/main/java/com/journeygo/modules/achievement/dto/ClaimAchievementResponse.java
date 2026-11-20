package com.journeygo.modules.achievement.dto;

import com.journeygo.modules.achievement.entity.enums.AchievementStatus;
import lombok.Builder;

import java.time.Instant;

@Builder
public record ClaimAchievementResponse(
        Long achievementId,
        String achievementCode,
        String achievementName,
        AchievementStatus status,
        int pointsAwarded,
        int newPointBalance,
        String badgeName,
        String badgeIcon,
        Long badgeId,
        Instant claimedAt
) {
}

