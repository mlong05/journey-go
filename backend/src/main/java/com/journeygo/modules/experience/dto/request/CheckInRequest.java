package com.journeygo.modules.experience.dto.request;

import com.journeygo.modules.experience.entity.enums.CheckInVerificationMethod;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.*;

import java.math.BigDecimal;

/**
 * Tourist gửi yêu cầu check-in tại một CheckInPoint vi mô (CONTEXT §5.2).
 *
 * BR-UCIP-2: với method = GPS → server tính khoảng cách bằng Haversine, isValid khi distance <= radius.
 * BR-UCIP-1: User chỉ check-in 1 lần / CheckInPoint.
 */
@Schema(description = "Yêu cầu check-in của Tourist")
public record CheckInRequest(

        @Schema(description = "Phương thức xác minh")
        @NotNull(message = "Verification method không được để trống")
        CheckInVerificationMethod verificationMethod,

        @Schema(description = "Vĩ độ Tourist đang đứng (bắt buộc với GPS)")
        @DecimalMin("-90.0") @DecimalMax("90.0")
        BigDecimal latitude,

        @Schema(description = "Kinh độ Tourist đang đứng (bắt buộc với GPS)")
        @DecimalMin("-180.0") @DecimalMax("180.0")
        BigDecimal longitude,

        @Schema(description = "Giá trị QR Tourist quét được (bắt buộc với QR)")
        @Size(max = 500)
        String qrValue,

        @Schema(description = "Task gắn với check-in này (optional — nếu Tourist đang trong task cụ thể)")
        Long taskId
) {}