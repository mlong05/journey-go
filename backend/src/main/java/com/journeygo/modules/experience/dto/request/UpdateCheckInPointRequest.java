package com.journeygo.modules.experience.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

/**
 * Sửa CheckInPoint.
 */
@Schema(description = "Cập nhật CheckInPoint")
public record UpdateCheckInPointRequest(

        @Schema(description = "Tên điểm check-in")
        @Size(max = 255)
        String name,

        @Schema(description = "Vĩ độ (latitude)", example = "21.0277000")
        @DecimalMin("-90.0") @DecimalMax("90.0")
        BigDecimal latitude,

        @Schema(description = "Kinh độ (longitude)", example = "105.8351000")
        @DecimalMin("-180.0") @DecimalMax("180.0")
        BigDecimal longitude,

        @Schema(description = "Bán kính cho phép (mét)", example = "50")
        @Min(1)
        Integer radiusMeters,

        @Schema(description = "Token QR code (nếu verification = QR_CODE)")
        @Size(max = 100)
        String qrToken,

        @Schema(description = "Thứ tự hiển thị")
        @Min(0)
        Integer sequenceOrder
) {}