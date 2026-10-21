package com.journeygo.modules.experience.dto.request;

import com.journeygo.modules.experience.entity.enums.ExperienceStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Đổi trạng thái Experience — chỉ chấp nhận DRAFT ↔ PUBLISHED. " +
        "Chuyển sang INACTIVE dùng DELETE (xoá mềm).")
public record ChangeExperienceStatusRequest(

        @Schema(description = "Trạng thái mới (chỉ DRAFT hoặc PUBLISHED)",
                allowableValues = {"DRAFT", "PUBLISHED"})
        @NotNull(message = "Trạng thái mới không được để trống")
        ExperienceStatus status
) {}
