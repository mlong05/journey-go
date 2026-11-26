package com.journeygo.modules.tourmerge.dto.request;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record ValidateTourMergeRequest(
        @NotNull(message = "hostSlotId không được để trống")
        Long hostSlotId,

        @NotNull(message = "guestSlotId không được để trống")
        Long guestSlotId,

        @Min(value = 1, message = "Sức chứa phương tiện ghép phải lớn hơn 0")
        Integer mergedCapacity
) {
}
