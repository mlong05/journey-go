package com.journeygo.modules.journey.dto;

import jakarta.validation.constraints.NotBlank;

import java.math.BigDecimal;

public record SubmitTaskRequest(
        @NotBlank(message = "Câu trả lời không được để trống")
        String answer,

        BigDecimal latitude,

        BigDecimal longitude
) {
}
