package com.journeygo.modules.gamification.dto;

import jakarta.validation.constraints.NotNull;

public record RedeemVoucherRequest(
        @NotNull(message = "voucherId không được để trống")
        Long voucherId
) {
}
