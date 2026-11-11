package com.journeygo.modules.booking.dto.response;

import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.BookingPassenger;
import com.journeygo.modules.booking.entity.BookingPassengerInvitation;
import com.journeygo.modules.booking.entity.enums.InvitationStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.time.Instant;

/**
 * Lời mời tham gia tour mà người dùng nhận được (hiển thị trong app, không cần deep link).
 *
 * <p>Khác với {@link InvitationResponse} (dùng cho màn xác nhận theo token), DTO này
 * kèm thêm thông tin người mời và tour để app hiển thị đúng câu:
 * <i>"Bạn đã được {người đặt} mời vào tour {tên tour}. Vui lòng bấm xác nhận để tham gia vào tour."</i>
 */
@Builder
@Schema(description = "Lời mời tham gia tour (trong app)")
public record PendingInvitationResponse(

        @Schema(description = "ID lời mời") Long id,
        @Schema(description = "ID booking") Long bookingId,
        @Schema(description = "Mã đơn đặt tour") String bookingCode,
        @Schema(description = "ID hành khách được mời") Long passengerId,
        @Schema(description = "Họ tên hành khách") String passengerName,
        @Schema(description = "Email được mời") String invitedEmail,
        @Schema(description = "Người gửi lời mời (người đặt tour)") String inviterName,
        @Schema(description = "Tên tour") String tourTitle,
        @Schema(description = "Ngày trải nghiệm") java.time.LocalDate experienceDate,
        @Schema(description = "Trạng thái: PENDING | ACCEPTED | EXPIRED | REVOKED") InvitationStatus status,
        @Schema(description = "Thời điểm hết hạn") Instant expiresAt,
        @Schema(description = "Thời điểm tạo") Instant createdAt,
        @Schema(description = "Còn hiệu lực hay không") boolean usable
) {

    public static PendingInvitationResponse fromEntity(BookingPassengerInvitation inv,
                                                       Booking booking,
                                                       BookingPassenger passenger,
                                                       String inviterName,
                                                       String tourTitle,
                                                       Instant now) {
        if (inv == null) return null;
        return PendingInvitationResponse.builder()
                .id(inv.getId())
                .bookingId(booking != null ? booking.getId() : null)
                .bookingCode(booking != null ? booking.getBookingCode() : null)
                .passengerId(passenger != null ? passenger.getId() : null)
                .passengerName(passenger != null ? passenger.getFullName() : null)
                .invitedEmail(inv.getInvitedEmail())
                .inviterName(inviterName)
                .tourTitle(tourTitle)
                .experienceDate(booking != null ? booking.getExperienceDate() : null)
                .status(inv.getStatus())
                .expiresAt(inv.getExpiresAt())
                .createdAt(inv.getCreatedAt())
                .usable(inv.isUsable(now))
                .build();
    }

    /**
     * Câu thông báo hiển thị trong trung tâm thông báo của app.
     */
    public String toNotificationBody() {
        String inviter = (inviterName == null || inviterName.isBlank()) ? "Người đặt tour" : inviterName;
        String tour = (tourTitle == null || tourTitle.isBlank()) ? "tour" : tourTitle;
        return "Bạn đã được " + inviter + " mời vào tour " + tour
                + ". Vui lòng bấm xác nhận để tham gia vào tour.";
    }
}
