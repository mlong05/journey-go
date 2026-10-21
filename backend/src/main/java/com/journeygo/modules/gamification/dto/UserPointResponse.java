package com.journeygo.modules.gamification.dto;

import com.journeygo.modules.gamification.entity.UserPoint;
import lombok.Builder;

import java.time.Instant;

@Builder
public record UserPointResponse(
        Long userId,
        Integer currentBalance,
        Integer lifetimeEarned,
        Integer lifetimeSpent,
        Instant updatedAt
) {
    public static UserPointResponse fromEntity(UserPoint entity) {
        return UserPointResponse.builder()
                .userId(entity.getUserId())
                .currentBalance(entity.getCurrentBalance())
                .lifetimeEarned(entity.getLifetimeEarned())
                .lifetimeSpent(entity.getLifetimeSpent())
                .updatedAt(entity.getUpdatedAt())
                .build();
    }
}
