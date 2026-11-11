package com.journeygo.modules.booking.dto.response;

import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.BookingPassenger;
import com.journeygo.modules.booking.entity.BookingPassengerInvitation;
import com.journeygo.modules.booking.entity.enums.BookingPassengerStatus;
import com.journeygo.modules.booking.entity.enums.InvitationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.time.Instant;

@Builder
@Schema(description = "Lời mời tham gia tour")
public record InvitationResponse(

        @Schema(description = "ID lời mời") Long id,
        @Schema(description = "ID hành khách được mời") Long passengerId,
        @Schema(description = "Họ tên hành khách") String passengerName,
        @Schema(description = "Email được mời") String invitedEmail,
        @Schema(description = "Trạng thái: PENDING | ACCEPTED | EXPIRED | REVOKED") InvitationStatus status,
        @Schema(description = "Thời điểm hết hạn (24 giờ kể từ lúc gửi)") Instant expiresAt,
        @Schema(description = "Thời điểm xác nhận") Instant acceptedAt,
        @Schema(description = "Thời điểm tạo") Instant createdAt,
        @Schema(description = "Còn hiệu lực hay không") boolean usable
) {

    public static InvitationResponse fromEntity(BookingPassengerInvitation inv,
                                                BookingPassenger passenger,
                                                Instant now) {
        if (inv == null) return null;
        return InvitationResponse.builder()
                .id(inv.getId())
                .passengerId(inv.getPassenger() != null ? inv.getPassenger().getId() : null)
                .passengerName(passenger != null ? passenger.getFullName() : null)
                .invitedEmail(inv.getInvitedEmail())
                .status(inv.getStatus())
                .expiresAt(inv.getExpiresAt())
                .acceptedAt(inv.getAcceptedAt())
                .createdAt(inv.getCreatedAt())
                .usable(inv.isUsable(now))
                .build();
    }

    /** Lời mời gửi kèm trong chi tiết Booking — rút gọn cho UI. */
    public static InvitationResponse fromEntity(BookingPassengerInvitation inv, Instant now) {
        return fromEntity(inv, null, now);
    }

    /** Passenger có còn hiệu lực không (đã bị thay thế / thu hồi thì không còn). */
    public static boolean isPassengerUsable(BookingPassenger p) {
        return p != null && p.getStatus() == BookingPassengerStatus.ACTIVE;
    }
}
