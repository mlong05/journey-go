package com.journeygo.modules.achievement.dto;

import com.journeygo.modules.achievement.entity.Achievement;
import com.journeygo.modules.achievement.entity.UserAchievement;
import com.journeygo.modules.achievement.entity.enums.AchievementCategory;
import com.journeygo.modules.achievement.entity.enums.AchievementStatus;
import com.journeygo.modules.achievement.entity.enums.AchievementTier;
import lombok.Builder;

import java.time.Instant;

@Builder
public record TouristAchievementResponse(
        Long id,
        String code,
        String name,
        String description,
        AchievementCategory category,
        AchievementTier tier,
        Integer targetValue,
        Integer currentProgress,
        AchievementStatus status,
        Integer pointsReward,
        String badgeName,
        String badgeIcon,
        Long badgeId,
        Instant achievedAt,
        Instant claimedAt
) {
    public static TouristAchievementResponse from(Achievement achievement, UserAchievement userAchievement) {
        int progress = userAchievement != null ? userAchievement.getCurrentProgress() : 0;
        AchievementStatus status = userAchievement != null ? userAchievement.getStatus() : AchievementStatus.LOCKED;
        Instant achievedAt = userAchievement != null ? userAchievement.getAchievedAt() : null;
        Instant claimedAt = userAchievement != null ? userAchievement.getClaimedAt() : null;

        Long bId = achievement.getBadge() != null ? achievement.getBadge().getId() : null;
        String bName = achievement.getBadgeName();
        String bIcon = achievement.getBadgeIcon();
        if (achievement.getBadge() != null) {
            if (bName == null) bName = achievement.getBadge().getName();
            if (bIcon == null) bIcon = achievement.getBadge().getIconUrl();
        }

        return TouristAchievementResponse.builder()
                .id(achievement.getId())
                .code(achievement.getCode())
                .name(achievement.getName())
                .description(achievement.getDescription())
                .category(achievement.getCategory())
                .tier(achievement.getTier())
                .targetValue(achievement.getTargetValue())
                .currentProgress(progress)
                .status(status)
                .pointsReward(achievement.getPointsReward())
                .badgeName(bName)
                .badgeIcon(bIcon)
                .badgeId(bId)
                .achievedAt(achievedAt)
                .claimedAt(claimedAt)
                .build();
    }
}

