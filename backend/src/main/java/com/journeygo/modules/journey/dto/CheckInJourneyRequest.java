package com.journeygo.modules.journey.dto;

import com.journeygo.modules.experience.entity.enums.CheckInVerificationMethod;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;

public record CheckInJourneyRequest(
        @NotNull(message = "Phương thức xác thực không được để trống")
        CheckInVerificationMethod verificationMethod,

        BigDecimal latitude,

        BigDecimal longitude,

        String qrValue
) {
}
