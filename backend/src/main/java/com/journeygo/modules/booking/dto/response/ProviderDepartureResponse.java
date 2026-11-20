package com.journeygo.modules.booking.dto.response;

import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.tour.entity.TourSlotStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Map;

/**
 * Một lịch khởi hành (tour × ngày) từ góc nhìn đối tác — tổng hợp số khách đã đăng ký.
 *
 * <p>"Đã đăng ký" = booking {@code CONFIRMED} hoặc {@code COMPLETED} (đã thanh toán).
 * "Đang giữ chỗ" = booking {@code PENDING_PAYMENT} (chưa thanh toán, có thể hết hạn).
 * Booking {@code CANCELLED} / {@code EXPIRED} không được tính.
 * Đơn đã được Admin duyệt hoàn tiền cũng không được tính (khách không còn tham gia).
 */
@Schema(description = "Lịch khởi hành của tour kèm số khách đã đăng ký")
public record ProviderDepartureResponse(
        @Schema(description = "ID tour") Long tourId,
        @Schema(description = "Tên tour") String tourTitle,
        @Schema(description = "Ngày khởi hành") LocalDate date,
        @Schema(description = "Sức chứa của slot (null nếu ngày này không có slot)") Integer capacity,
        @Schema(description = "Số chỗ slot đang bị chiếm (đã trừ chỗ của đơn đã hoàn tiền)") Integer reservedSeats,
        @Schema(description = "Trạng thái slot (null nếu không có slot)") TourSlotStatus slotStatus,
        @Schema(description = "Số đơn đã xác nhận") int confirmedBookings,
        @Schema(description = "Số khách đã xác nhận") int confirmedGuests,
        @Schema(description = "Số chỗ khách đã xác nhận chiếm") int confirmedSeats,
        @Schema(description = "Số đơn đang chờ thanh toán") int pendingBookings,
        @Schema(description = "Số khách trong đơn chờ thanh toán") int pendingGuests,
        @Schema(description = "Số chỗ đơn chờ thanh toán đang giữ") int pendingSeats,
        @Schema(description = "Cơ cấu khách đã xác nhận theo loại") Map<GuestType, Integer> guestBreakdown,
        @Schema(description = "Doanh thu (tổng tiền các đơn đã xác nhận)") BigDecimal revenue,
        @Schema(description = "Ngày khởi hành đã qua") boolean past
) {
}
