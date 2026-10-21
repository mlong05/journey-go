package com.journeygo.modules.gamification.dto;

import com.journeygo.modules.gamification.entity.Badge;
import com.journeygo.modules.gamification.entity.enums.BadgeType;
import lombok.Builder;

import java.time.Instant;

@Builder
public record BadgeResponse(
        Long id,
        String code,
        String name,
        String description,
        String iconUrl,
        Long destinationId,
        BadgeType badgeType,
        Integer bonusPoints,
        boolean active,
        Instant createdAt
) {
    public static BadgeResponse fromEntity(Badge entity) {
        return BadgeResponse.builder()
                .id(entity.getId())
                .code(entity.getCode())
                .name(entity.getName())
                .description(entity.getDescription())
                .iconUrl(entity.getIconUrl())
                .destinationId(entity.getDestinationId())
                .badgeType(entity.getBadgeType())
                .bonusPoints(entity.getBonusPoints())
                .active(entity.isActive())
                .createdAt(entity.getCreatedAt())
                .build();
    }
}
