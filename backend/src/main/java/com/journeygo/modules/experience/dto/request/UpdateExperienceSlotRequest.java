package com.journeygo.modules.experience.dto.request;

import com.journeygo.modules.experience.entity.enums.SlotStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

/**
 * Cập nhật ExperienceSlot — chỉ quota và status.
 */
@Schema(description = "Cập nhật ExperienceSlot")
public record UpdateExperienceSlotRequest(

        @Schema(description = "Số TOUR tối đa platform mới/ngày")
        @Min(0)
        Integer maxTourPerDay,

        @Schema(description = "Trạng thái: AVAILABLE / SOLD_OUT / PAUSED / CLOSED")
        SlotStatus status
) {}
