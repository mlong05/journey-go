package com.journeygo.modules.tourmerge.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.time.LocalTime;

public record CreateTourMergeRequest(
        @NotNull(message = "hostSlotId không được để trống")
        Long hostSlotId,

        @NotNull(message = "guestSlotId không được để trống")
        Long guestSlotId,

        @NotNull(message = "Giờ xuất phát chung không được để trống")
        LocalTime mergedDepartureTime,

        @NotBlank(message = "Điểm tập trung chung không được để trống")
        String mergedMeetingPoint,

        @NotNull(message = "Sức chứa phương tiện ghép không được để trống")
        @Min(value = 1, message = "Sức chứa phương tiện ghép phải lớn hơn 0")
        Integer mergedCapacity,

        String note
) {
}
