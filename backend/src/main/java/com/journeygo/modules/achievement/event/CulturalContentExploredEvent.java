package com.journeygo.modules.achievement.event;

public record CulturalContentExploredEvent(
        Long userId,
        Long contentId,
        Long destinationId
) {
}

