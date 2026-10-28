package com.journeygo.modules.booking.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

import java.time.LocalDate;

@Schema(description = "Yêu cầu đặt tour")
public record CreateBookingRequest(

        @Schema(description = "ID tour cần đặt", example = "1")
        @NotNull(message = "Tour không được để trống")
        @Positive(message = "Tour không hợp lệ")
        Long tourId,

        @Schema(description = "Ngày trải nghiệm", example = "2026-11-20")
        @NotNull(message = "Ngày trải nghiệm không được để trống")
        LocalDate experienceDate
) {}
