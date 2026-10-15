package com.journeygo.modules.experience.dto.response;

import com.journeygo.modules.experience.entity.Task;
import com.journeygo.modules.experience.entity.enums.TaskStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.time.Instant;

/**
 * Response Task.
 *
 * Lưu ý: KHÔNG trả task.questions ở đây (riêng endpoint GET /tasks/{id}/questions).
 * Nếu Tourist xem Question → phải dùng QuestionResponse.forTourist() để ẨN expectedText + isCorrect.
 */
@Builder
@Schema(description = "Response Task")
public record TaskResponse(

        @Schema(description = "ID Task") Long id,
        @Schema(description = "ID Experience") Long experienceId,
        @Schema(description = "ID TaskType") Long taskTypeId,
        @Schema(description = "Code TaskType") String taskTypeCode,
        @Schema(description = "Tên TaskType") String taskTypeName,
        @Schema(description = "Tiêu đề") String title,
        @Schema(description = "Mô tả") String description,
        @Schema(description = "Thứ tự") Integer sequenceOrder,
        @Schema(description = "Điểm thưởng") Integer pointsReward,
        @Schema(description = "Số lần thử tối đa") Integer maxAttempts,
        @Schema(description = "ID CheckInPoint") Long checkInPointId,
        @Schema(description = "Trạng thái") TaskStatus status,
        @Schema(description = "Ngày tạo") Instant createdAt,
        @Schema(description = "Ngày cập nhật") Instant updatedAt
) {
    public static TaskResponse fromEntity(Task t) {
        return TaskResponse.builder()
                .id(t.getId())
                .experienceId(t.getExperience() != null ? t.getExperience().getId() : null)
                .taskTypeId(t.getTaskType() != null ? t.getTaskType().getId() : null)
                .taskTypeCode(t.getTaskType() != null ? t.getTaskType().getCode() : null)
                .taskTypeName(t.getTaskType() != null ? t.getTaskType().getName() : null)
                .title(t.getTitle())
                .description(t.getDescription())
                .sequenceOrder(t.getSequenceOrder())
                .pointsReward(t.getPointsReward())
                .maxAttempts(t.getMaxAttempts())
                .checkInPointId(t.getCheckInPoint() != null ? t.getCheckInPoint().getId() : null)
                .status(t.getStatus())
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .build();
    }
}