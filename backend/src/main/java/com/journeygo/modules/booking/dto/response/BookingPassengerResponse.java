package com.journeygo.modules.booking.dto.response;

import com.journeygo.modules.booking.entity.BookingPassenger;
import com.journeygo.modules.booking.entity.enums.BookingPassengerStatus;
import com.journeygo.modules.booking.entity.enums.InvitationStatus;
import com.journeygo.modules.tour.entity.GuestType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

/**
 * Thông tin một hành khách trong Booking.
 *
 * @param hasAccount   hành khách đã có tài khoản JourneyGo (đã liên kết)
 * @param canViewTour  hành khách được phép truy cập trải nghiệm tour hay không
 * @param personalInfoVisible thông tin cá nhân (ngày sinh / giới tính / email) có hiển thị hay không.
 *                            {@code false} khi người đang xem là hành khách được mời — theo ma trận
 *                            quyền, hành khách được mời KHÔNG được xem thông tin cá nhân của
 *                            hành khách khác.
 * @param invitationStatus trạng thái lời mời gần nhất của hành khách này (null = chưa gửi lời mời)
 */
@Builder
@Schema(description = "Thông tin hành khách trong booking")
public record BookingPassengerResponse(

        @Schema(description = "ID hành khách") Long id,
        @Schema(description = "Họ và tên") String fullName,
        @Schema(description = "Ngày sinh") LocalDate birthDate,
        @Schema(description = "Giới tính") String gender,
        @Schema(description = "Email") String email,
        @Schema(description = "Loại khách") GuestType guestType,
        @Schema(description = "Nhãn loại khách") String guestTypeLabel,
        @Schema(description = "Giá đã chốt cho hành khách này") BigDecimal price,
        @Schema(description = "Loại khách này có chiếm slot hay không") boolean countsTowardSlot,
        @Schema(description = "true = chính người đặt tour") boolean bookingCustomer,
        @Schema(description = "Đã liên kết tài khoản JourneyGo") boolean hasAccount,
        @Schema(description = "Trạng thái: ACTIVE | REPLACED | REVOKED") BookingPassengerStatus status,
        @Schema(description = "Tuổi tại ngày trải nghiệm") Integer ageAtExperience,
        @Schema(description = "Thông tin cá nhân có hiển thị hay không") boolean personalInfoVisible,
        @Schema(description = "Trạng thái lời mời: PENDING | ACCEPTED | EXPIRED | REVOKED")
        InvitationStatus invitationStatus,
        @Schema(description = "Thời điểm hết hạn của lời mời (24h)") Instant invitationExpiresAt
) {

    public static BookingPassengerResponse fromEntity(BookingPassenger p, LocalDate experienceDate) {
        return fromEntity(p, experienceDate, true, null, null);
    }

    /**
     * Mapping đầy đủ — dùng khi cần ẩn thông tin cá nhân hoặc kèm trạng thái lời mời.
     *
     * @param personalInfoVisible false ⇒ email / ngày sinh / giới tính bị ẩn
     * @param invitationStatus    trạng thái lời mời gần nhất (null = chưa có lời mời)
     * @param invitationExpiresAt thời điểm hết hạn của lời mời
     */
    public static BookingPassengerResponse fromEntity(BookingPassenger p,
                                                      LocalDate experienceDate,
                                                      boolean personalInfoVisible,
                                                      InvitationStatus invitationStatus,
                                                      Instant invitationExpiresAt) {
        if (p == null) return null;

        Integer age = null;
        if (p.getBirthDate() != null && experienceDate != null
                && !p.getBirthDate().isAfter(experienceDate)) {
            age = java.time.Period.between(p.getBirthDate(), experienceDate).getYears();
        }

        boolean visible = personalInfoVisible;

        return BookingPassengerResponse.builder()
                .id(p.getId())
                .fullName(p.getFullName())
                .birthDate(visible ? p.getBirthDate() : null)
                .gender(visible ? p.getGender() : null)
                .email(visible ? p.getEmail() : null)
                .guestType(p.getGuestType())
                .guestTypeLabel(p.getGuestType() != null ? p.getGuestType().getLabel() : null)
                .price(p.getPrice())
                .countsTowardSlot(p.isCountsTowardSlot())
                .bookingCustomer(p.isBookingCustomer())
                .hasAccount(p.hasLinkedAccount())
                .status(p.getStatus())
                .ageAtExperience(age)
                .personalInfoVisible(visible)
                .invitationStatus(invitationStatus)
                .invitationExpiresAt(invitationExpiresAt)
                .build();
    }
}
