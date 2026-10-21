package com.journeygo.modules.tour.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

@Schema(description = "Một điểm đến trong hành trình tour")
public record TourDestinationRequest(

        @Schema(description = "ID điểm đến", example = "1")
        @NotNull(message = "ID điểm đến không được để trống")
        Long destinationId,

        @Schema(description = "Thứ tự trong hành trình (bắt đầu từ 1)", example = "1")
        @NotNull(message = "Thứ tự không được để trống")
        @Min(value = 1, message = "Thứ tự phải >= 1")
        Integer sequenceOrder
) {}
