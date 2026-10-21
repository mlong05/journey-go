package com.journeygo.modules.journey.dto;

import com.journeygo.modules.journey.entity.JourneyDestinationProgress;
import com.journeygo.modules.journey.entity.enums.DestinationProgressStatus;
import lombok.Builder;

import java.time.Instant;
import java.util.Collections;
import java.util.List;

@Builder
public record JourneyDestinationProgressResponse(
        Long id,
        Long destinationId,
        String destinationName,
        Integer orderIndex,
        Long experienceId,
        DestinationProgressStatus status,
        boolean checkedIn,
        Instant checkedInAt,
        boolean badgeAwarded,
        Long badgeId,
        Integer tasksCompleted,
        Integer totalTasks,
        Instant startedAt,
        Instant completedAt,
        List<JourneyTaskProgressResponse> tasks
) {
    public static JourneyDestinationProgressResponse fromEntity(JourneyDestinationProgress entity) {
        List<JourneyTaskProgressResponse> taskResponses = entity.getTasks() != null
                ? entity.getTasks().stream().map(JourneyTaskProgressResponse::fromEntity).toList()
                : Collections.emptyList();

        return JourneyDestinationProgressResponse.builder()
                .id(entity.getId())
                .destinationId(entity.getDestinationId())
                .destinationName(entity.getDestinationName())
                .orderIndex(entity.getOrderIndex())
                .experienceId(entity.getExperienceId())
                .status(entity.getStatus())
                .checkedIn(entity.isCheckedIn())
                .checkedInAt(entity.getCheckedInAt())
                .badgeAwarded(entity.isBadgeAwarded())
                .badgeId(entity.getBadgeId())
                .tasksCompleted(entity.getTasksCompleted())
                .totalTasks(entity.getTotalTasks())
                .startedAt(entity.getStartedAt())
                .completedAt(entity.getCompletedAt())
                .tasks(taskResponses)
                .build();
    }
}
