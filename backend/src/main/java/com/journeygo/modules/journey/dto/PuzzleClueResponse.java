package com.journeygo.modules.journey.dto;

import lombok.Builder;

import java.math.BigDecimal;

@Builder
public record PuzzleClueResponse(
        Long taskId,
        String taskName,
        String taskType,
        String clue,
        BigDecimal targetLatitude,
        BigDecimal targetLongitude,
        Integer targetRadiusMeters,
        String hint,
        Integer attempts,
        boolean completed
) {
}
