package com.journeygo.modules.tourmerge.dto.request;

import jakarta.validation.constraints.NotNull;

public record ReviewTourMergeRequest(
        @NotNull(message = "approved không được để trống")
        Boolean approved,

        String rejectReason
) {
}
