package com.journeygo.modules.experience.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.time.LocalDate;

/**
 * Tạo ExperienceSlot — phân bổ quota PLATFORM cho Experience theo ngày (đếm theo TOUR).
 */
@Schema(description = "Yêu cầu tạo ExperienceSlot (phân bổ quota platform theo tour)")
public record CreateExperienceSlotRequest(

        @Schema(description = "Ngày áp dụng (hôm nay hoặc tương lai)")
        @NotNull
        @FutureOrPresent(message = "Ngày slot phải là hôm nay hoặc trong tương lai")
        LocalDate slotDate,

        @Schema(description = "Số TOUR tối đa platform phân bổ cho trải nghiệm này trong ngày", example = "10")
        @NotNull
        @Min(value = 0, message = "Max tour per day phải >= 0")
        Integer maxTourPerDay
) {}
