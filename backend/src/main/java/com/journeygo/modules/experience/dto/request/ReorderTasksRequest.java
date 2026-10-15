package com.journeygo.modules.experience.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.util.List;

@Schema(description = "Sắp xếp lại thứ tự Task trong Experience")
public record ReorderTasksRequest(

        @Schema(description = "Danh sách ID Task theo thứ tự mới")
        @NotNull(message = "Task IDs không được để trống")
        @Size(min = 1, message = "Phải có ít nhất 1 Task")
        List<Long> taskIds
) {}
