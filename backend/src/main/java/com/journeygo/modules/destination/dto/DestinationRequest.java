package com.journeygo.modules.destination.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;
import java.util.Set;

@Schema(description = "Yêu cầu tạo hoặc cập nhật điểm đến")
public record DestinationRequest(

        @Schema(description = "Tên điểm đến", example = "Vịnh Hạ Long")
        @NotBlank(message = "Tên không được để trống")
        String name,

        @Schema(description = "Địa chỉ", example = "Quảng Ninh, Việt Nam")
        @NotBlank(message = "Địa chỉ không được để trống")
        String address,

        @Schema(description = "Vĩ độ", example = "20.9101")
        @NotNull(message = "Vĩ độ không được để trống")
        @DecimalMin(value = "-90.0", message = "Vĩ độ phải >= -90")
        @DecimalMax(value = "90.0", message = "Vĩ độ phải <= 90")
        BigDecimal latitude,

        @Schema(description = "Kinh độ", example = "107.1839")
        @NotNull(message = "Kinh độ không được để trống")
        @DecimalMin(value = "-180.0", message = "Kinh độ phải >= -180")
        @DecimalMax(value = "180.0", message = "Kinh độ phải <= 180")
        BigDecimal longitude,

        @Schema(description = "Sức chứa (số người)", example = "500")
        @NotNull(message = "Sức chứa không được để trống")
        @Min(value = 1, message = "Sức chứa phải >= 1")
        Integer capacity,

        @Schema(description = "ID khu vực", example = "1")
        Long regionId,

        @Schema(description = "Danh sách ID chủ đề", example = "[1, 2]")
        Set<Long> themeIds
) {}
