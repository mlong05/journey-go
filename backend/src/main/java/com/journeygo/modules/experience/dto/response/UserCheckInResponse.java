package com.journeygo.modules.experience.dto.response;

import com.journeygo.modules.experience.entity.UserCheckInPoint;
import com.journeygo.modules.experience.entity.enums.CheckInVerificationMethod;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

/**
 * Response UserCheckInPoint - ghi nhận Tourist đã check-in tại CheckInPoint vi mô.
 *
 * BR-UCIP-2: isValid = true khi distance <= radius_meters (hoặc QR khớp với check_in_point.qr_token).
 */
@Builder
@Schema(description = "Response check-in của Tourist tại CheckInPoint vi mô")
public record UserCheckInResponse(

        @Schema(description = "ID record check-in") Long id,
        @Schema(description = "ID Tourist") Long userId,
        @Schema(description = "ID CheckInPoint") Long checkInPointId,
        @Schema(description = "ID Experience") Long experienceId,
        @Schema(description = "ID Task") Long taskId,
        @Schema(description = "Phương thức xác minh") CheckInVerificationMethod verificationMethod,
        @Schema(description = "Vĩ độ Tourist gửi") BigDecimal latitude,
        @Schema(description = "Kinh độ Tourist gửi") BigDecimal longitude,
        @Schema(description = "Khoảng cách đến điểm (mét)") Integer distanceMeters,
        @Schema(description = "QR value Tourist quét được") String qrValue,
        @Schema(description = "Có hợp lệ không?") boolean isValid,
        @Schema(description = "Thời điểm check-in") Instant checkedInAt
) {
    public static UserCheckInResponse fromEntity(UserCheckInPoint uc) {
        return UserCheckInResponse.builder()
                .id(uc.getId())
                .userId(uc.getUserId())
                .checkInPointId(uc.getCheckInPoint() != null ? uc.getCheckInPoint().getId() : null)
                .experienceId(uc.getExperience() != null ? uc.getExperience().getId() : null)
                .taskId(uc.getTask() != null ? uc.getTask().getId() : null)
                .verificationMethod(uc.getVerificationMethod())
                .latitude(uc.getLatitude())
                .longitude(uc.getLongitude())
                .distanceMeters(uc.getDistanceMeters())
                .qrValue(uc.getQrValue())
                .isValid(uc.isValid())
                .checkedInAt(uc.getCheckedInAt())
                .build();
    }
}