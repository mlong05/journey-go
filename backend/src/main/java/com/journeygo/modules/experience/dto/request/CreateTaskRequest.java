package com.journeygo.modules.experience.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

@Schema(description = "Yêu cầu tạo Task trong Experience")
public record CreateTaskRequest(

        @Schema(description = "ID TaskType (QUIZ / FIELD_CLUE / LOCATION_VISIT / QR_CHECKPOINT / PHOTO_CHALLENGE)")
        @NotNull(message = "TaskType ID không được để trống")
        Long taskTypeId,

        @Schema(description = "Tiêu đề Task")
        @NotBlank(message = "Tiêu đề không được để trống")
        @Size(max = 255)
        String title,

        @Schema(description = "Mô tả Task")
        String description,

        @Schema(description = "Thứ tự trong Experience (UNIQUE trong cùng experience — BR-TASK-2)")
        @NotNull(message = "Sequence order không được để trống")
        @Min(value = 0, message = "Sequence order phải >= 0")
        Integer sequenceOrder,

        @Schema(description = "Điểm thưởng")
        @NotNull(message = "Points reward không được để trống")
        @Min(value = 0, message = "Points reward phải >= 0")
        Integer pointsReward,

        @Schema(description = "Số lần thử tối đa")
        @Min(value = 1, message = "Max attempts phải >= 1")
        Integer maxAttempts,

        @Schema(description = "Nhiệm vụ tương tác ngoài thực tế: true = tới trạm nào trước cũng được; false = đi theo thứ tự câu hỏi")
        Boolean freeOrder,

        @Schema(description = "ID CheckInPoint (bắt buộc với task GPS/QR/FIELD — BR-TASK-4)")
        Long checkInPointId
) {}
