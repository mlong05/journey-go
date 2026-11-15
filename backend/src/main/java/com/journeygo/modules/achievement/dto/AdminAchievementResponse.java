package com.journeygo.modules.achievement.dto;

import com.journeygo.modules.achievement.entity.Achievement;
import com.journeygo.modules.achievement.entity.enums.AchievementCategory;
import com.journeygo.modules.achievement.entity.enums.AchievementTier;
import lombok.Builder;

import java.time.Instant;

@Builder
public record AdminAchievementResponse(
        Long id,
        String code,
        String name,
        String description,
        AchievementCategory category,
        AchievementTier tier,
        Integer targetValue,
        Integer pointsReward,
        String badgeName,
        String badgeIcon,
        Long badgeId,
        boolean active,
        long achievedCount,
        long claimedCount,
        Instant createdAt,
        Instant updatedAt
) {
    public static AdminAchievementResponse from(Achievement a, long achievedCount, long claimedCount) {
        Long bId = a.getBadge() != null ? a.getBadge().getId() : null;
        String bName = a.getBadgeName();
        String bIcon = a.getBadgeIcon();
        if (a.getBadge() != null) {
            if (bName == null) bName = a.getBadge().getName();
            if (bIcon == null) bIcon = a.getBadge().getIconUrl();
        }

        return AdminAchievementResponse.builder()
                .id(a.getId())
                .code(a.getCode())
                .name(a.getName())
                .description(a.getDescription())
                .category(a.getCategory())
                .tier(a.getTier())
                .targetValue(a.getTargetValue())
                .pointsReward(a.getPointsReward())
                .badgeName(bName)
                .badgeIcon(bIcon)
                .badgeId(bId)
                .active(a.isActive())
                .achievedCount(achievedCount)
                .claimedCount(claimedCount)
                .createdAt(a.getCreatedAt())
                .updatedAt(a.getUpdatedAt())
                .build();
    }
}

