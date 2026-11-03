package com.journeygo.modules.gamification.dto;

import com.journeygo.modules.gamification.entity.Badge;
import com.journeygo.modules.gamification.entity.enums.BadgeType;

import java.time.Instant;

/** Huy hiệu cho trang quản trị, kèm số du khách đã đạt. */
public record AdminBadgeResponse(
        Long id,
        String code,
        String name,
        String description,
        String iconUrl,
        Long destinationId,
        BadgeType badgeType,
        Integer bonusPoints,
        boolean active,
        Instant createdAt,
        long earnedCount
) {
    public static AdminBadgeResponse fromEntity(Badge entity, long earnedCount) {
        return new AdminBadgeResponse(entity.getId(), entity.getCode(), entity.getName(), entity.getDescription(),
                entity.getIconUrl(), entity.getDestinationId(), entity.getBadgeType(), entity.getBonusPoints(),
                entity.isActive(), entity.getCreatedAt(), earnedCount);
    }
}
