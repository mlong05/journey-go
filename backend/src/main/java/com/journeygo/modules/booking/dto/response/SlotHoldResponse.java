package com.journeygo.modules.booking.dto.response;

import com.journeygo.modules.booking.entity.BookingSlotHold;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.time.Instant;
import java.time.LocalDate;

@Builder
@Schema(description = "Thông tin slot đã giữ cho booking")
public record SlotHoldResponse(

        @Schema(description = "ID bản ghi giữ chỗ") Long id,
        @Schema(description = "ID ExperienceSlot") Long experienceSlotId,
        @Schema(description = "ID Experience") Long experienceId,
        @Schema(description = "Ngày của slot") LocalDate slotDate,
        @Schema(description = "Đã giải phóng chưa") boolean released,
        @Schema(description = "Thời điểm giữ chỗ") Instant heldAt,
        @Schema(description = "Thời điểm giải phóng") Instant releasedAt
) {
    public static SlotHoldResponse fromEntity(BookingSlotHold h) {
        if (h == null) return null;
        return SlotHoldResponse.builder()
                .id(h.getId())
                .experienceSlotId(h.getExperienceSlot() != null ? h.getExperienceSlot().getId() : null)
                .experienceId(h.getExperienceId())
                .slotDate(h.getSlotDate())
                .released(h.isReleased())
                .heldAt(h.getHeldAt())
                .releasedAt(h.getReleasedAt())
                .build();
    }
}
