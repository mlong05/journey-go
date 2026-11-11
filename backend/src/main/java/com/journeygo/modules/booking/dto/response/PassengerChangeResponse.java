package com.journeygo.modules.booking.dto.response;

import com.journeygo.modules.booking.entity.BookingPassengerChange;
import com.journeygo.modules.booking.entity.enums.PassengerChangeStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;

@Builder
@Schema(description = "Yêu cầu / biên bản thay đổi hành khách")
public record PassengerChangeResponse(

        @Schema(description = "ID yêu cầu") Long id,
        @Schema(description = "ID booking") Long bookingId,
        @Schema(description = "ID hành khách bị thay thế") Long passengerId,
        @Schema(description = "Họ tên hành khách bị thay thế") String passengerName,
        @Schema(description = "Người gửi yêu cầu") Long requestedBy,
        @Schema(description = "Đối tác xử lý") Long processedBy,
        @Schema(description = "JSON hành khách trước khi thay đổi") String oldData,
        @Schema(description = "JSON hành khách sau khi thay đổi") String newData,
        @Schema(description = "Chênh lệch giá") BigDecimal priceDelta,
        @Schema(description = "Lý do") String reason,
        @Schema(description = "Trạng thái: PENDING | APPROVED | REJECTED") PassengerChangeStatus status,
        @Schema(description = "Thời điểm gửi") Instant createdAt,
        @Schema(description = "Thời điểm xử lý") Instant processedAt
) {

    public static PassengerChangeResponse fromEntity(BookingPassengerChange c, String passengerName) {
        if (c == null) return null;
        return PassengerChangeResponse.builder()
                .id(c.getId())
                .bookingId(c.getBooking() != null ? c.getBooking().getId() : null)
                .passengerId(c.getPassenger() != null ? c.getPassenger().getId() : null)
                .passengerName(passengerName)
                .requestedBy(c.getRequestedBy())
                .processedBy(c.getProcessedBy())
                .oldData(c.getOldData())
                .newData(c.getNewData())
                .priceDelta(c.getPriceDelta())
                .reason(c.getReason())
                .status(c.getStatus())
                .createdAt(c.getCreatedAt())
                .processedAt(c.getProcessedAt())
                .build();
    }
}
