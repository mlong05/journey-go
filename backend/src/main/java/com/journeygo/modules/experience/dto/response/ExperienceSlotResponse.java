package com.journeygo.modules.experience.dto.response;

import com.journeygo.modules.experience.entity.ExperienceSlot;
import com.journeygo.modules.experience.entity.enums.SlotStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Response ExperienceSlot — quota PLATFORM cho Experience theo ngày (đếm theo TOUR).
 */
@Builder
@Schema(description = "Response ExperienceSlot (quota platform, đếm theo tour)")
public record ExperienceSlotResponse(

        @Schema(description = "ID Slot") Long id,
        @Schema(description = "ID Experience") Long experienceId,
        @Schema(description = "ID Destination (lấy từ Experience)") Long destinationId,
        @Schema(description = "Ngày") LocalDate slotDate,
        @Schema(description = "Số TOUR tối đa platform phân bổ/ngày") Integer maxTourPerDay,
        @Schema(description = "Số TOUR đã bán") Integer bookedTourCount,
        @Schema(description = "Còn trống (tour)") Integer remaining,
        @Schema(description = "Trạng thái") SlotStatus status,
        @Schema(description = "Ngày tạo") Instant createdAt
) {
    public static ExperienceSlotResponse fromEntity(ExperienceSlot s) {
        int remaining = Math.max(0, s.getMaxTourPerDay() - s.getBookedTourCount());
        return ExperienceSlotResponse.builder()
                .id(s.getId())
                .experienceId(s.getExperience() != null ? s.getExperience().getId() : null)
                .destinationId(s.getExperience() != null ? s.getExperience().getDestinationId() : null)
                .slotDate(s.getSlotDate())
                .maxTourPerDay(s.getMaxTourPerDay())
                .bookedTourCount(s.getBookedTourCount())
                .remaining(remaining)
                .status(s.getStatus())
                .createdAt(s.getCreatedAt())
                .build();
    }
}
