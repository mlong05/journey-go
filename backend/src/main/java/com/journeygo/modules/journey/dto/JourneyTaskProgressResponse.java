package com.journeygo.modules.journey.dto;

import com.journeygo.modules.journey.entity.JourneyTaskProgress;
import com.journeygo.modules.journey.entity.enums.TaskProgressStatus;
import lombok.Builder;

import java.time.Instant;

@Builder
public record JourneyTaskProgressResponse(
        Long id,
        Long taskId,
        String taskName,
        String taskType,
        Integer orderIndex,
        TaskProgressStatus status,
        Integer pointsEarned,
        Integer attempts,
        Boolean isCorrect,
        Instant startedAt,
        Instant completedAt
) {
    public static JourneyTaskProgressResponse fromEntity(JourneyTaskProgress entity) {
        return JourneyTaskProgressResponse.builder()
                .id(entity.getId())
                .taskId(entity.getTaskId())
                .taskName(entity.getTaskName())
                .taskType(entity.getTaskType())
                .orderIndex(entity.getOrderIndex())
                .status(entity.getStatus())
                .pointsEarned(entity.getPointsEarned())
                .attempts(entity.getAttempts())
                .isCorrect(entity.getIsCorrect())
                .startedAt(entity.getStartedAt())
                .completedAt(entity.getCompletedAt())
                .build();
    }
}
