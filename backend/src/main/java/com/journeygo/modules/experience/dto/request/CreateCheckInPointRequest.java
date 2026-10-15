package com.journeygo.modules.experience.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

/**
 * Tạo CheckInPoint cho Experience.
 *
 * BR-CIP-1: qr_token UNIQUE toàn cục.
 * Theo schema ĐÚ-02 §3.4: precision(10,8) cho lat, (11,8) cho lng.
 */
@Schema(description = "Yêu cầu tạo CheckInPoint")
public record CreateCheckInPointRequest(

        @Schema(description = "Tên điểm check-in")
        @NotBlank
        @Size(max = 255)
        String name,

        @Schema(description = "Vĩ độ", example = "20.25060000")
        @NotNull
        @DecimalMin(value = "-90.0")
        @DecimalMax(value = "90.0")
        BigDecimal latitude,

        @Schema(description = "Kinh độ", example = "105.90480000")
        @NotNull
        @DecimalMin(value = "-180.0")
        @DecimalMax(value = "180.0")
        BigDecimal longitude,

        @Schema(description = "Bán kính cho phép (mét)", example = "50")
        @NotNull
        @Min(value = 1, message = "Radius phải >= 1 mét")
        Integer radiusMeters,

        @Schema(description = "Token QR duy nhất toàn cục — BR-CIP-1", example = "QR_TRANG_AN_C1")
        @NotBlank
        @Size(max = 100)
        String qrToken,

        @Schema(description = "Thứ tự trong Experience")
        @NotNull
        @Min(0)
        Integer sequenceOrder
) {}