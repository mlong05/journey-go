package com.journeygo.modules.tourmerge.dto.request;

import jakarta.validation.constraints.NotNull;

public record ConfirmTourMergeRequest(
        @NotNull(message = "confirm không được để trống")
        Boolean confirm,

        String rejectReason
) {
}
