package com.journeygo.modules.tour.dto;

import com.journeygo.modules.tour.entity.TourType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.Valid;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@Schema(description = "Yêu cầu tạo hoặc cập nhật tour du lịch")
public record TourRequest(

        @Schema(description = "Tên tour", example = "Khám phá Hà Nội 3 ngày 2 đêm")
        @NotBlank(message = "Tên tour không được để trống")
        String title,

        @Schema(description = "Loại hình tour", example = "CULTURAL")
        @NotNull(message = "Loại hình tour không được để trống")
        TourType tourType,

        @Schema(description = "Số ngày của tour", example = "3")
        @NotNull(message = "Số ngày không được để trống")
        @Min(value = 1, message = "Tour phải có ít nhất 1 ngày")
        Integer durationDays,

        @Schema(description = "Giá tour cho mỗi người (VND)", example = "1500000")
        @NotNull(message = "Giá tour không được để trống")
        @DecimalMin(value = "0.01", message = "Giá tour phải lớn hơn 0")
        BigDecimal price,

        @Schema(description = "Ngày bắt đầu tour (yyyy-MM-dd)", example = "2026-12-01")
        @NotNull(message = "Ngày bắt đầu không được để trống")
        LocalDate startDate,

        @Schema(description = "Ngày kết thúc tour (yyyy-MM-dd)", example = "2026-12-03")
        @NotNull(message = "Ngày kết thúc không được để trống")
        LocalDate endDate,

        @Schema(description = "Danh sách điểm đến theo thứ tự hành trình (ít nhất 1 điểm đến)")
        @NotNull(message = "Danh sách điểm đến không được để trống")
        @Size(min = 1, message = "Tour phải có ít nhất 1 điểm đến")
        @Valid
        List<TourDestinationRequest> destinations
) {}
