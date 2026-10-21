package com.journeygo.modules.gamification.dto;

import com.journeygo.modules.gamification.entity.UserBadge;
import lombok.Builder;

import java.time.Instant;

@Builder
public record UserBadgeResponse(
        Long id,
        Long userId,
        Long badgeId,
        String badgeCode,
        String badgeName,
        String badgeDescription,
        String badgeIconUrl,
        String badgeType,
        Long journeyId,
        Long destinationId,
        Instant earnedAt
) {
    public static UserBadgeResponse fromEntity(UserBadge entity) {
        return UserBadgeResponse.builder()
                .id(entity.getId())
                .userId(entity.getUserId())
                .badgeId(entity.getBadge().getId())
                .badgeCode(entity.getBadge().getCode())
                .badgeName(entity.getBadge().getName())
                .badgeDescription(entity.getBadge().getDescription())
                .badgeIconUrl(entity.getBadge().getIconUrl())
                .badgeType(entity.getBadge().getBadgeType().name())
                .journeyId(entity.getJourneyId())
                .destinationId(entity.getDestinationId())
                .earnedAt(entity.getEarnedAt())
                .build();
    }
}
