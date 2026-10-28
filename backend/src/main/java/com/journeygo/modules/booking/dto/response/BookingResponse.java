package com.journeygo.modules.booking.dto.response;

import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.enums.BookingStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.List;

@Builder
@Schema(description = "Thông tin booking")
public record BookingResponse(

        @Schema(description = "ID booking") Long id,
        @Schema(description = "Mã đơn") String bookingCode,
        @Schema(description = "ID tourist") Long touristId,
        @Schema(description = "Tên tourist") String touristName,
        @Schema(description = "ID tour") Long tourId,
        @Schema(description = "Tên tour") String tourTitle,
        @Schema(description = "Ngày trải nghiệm") LocalDate experienceDate,
        @Schema(description = "Tổng tiền đã chốt (VND)") BigDecimal totalAmount,
        @Schema(description = "Loại tiền") String currency,
        @Schema(description = "Trạng thái booking") BookingStatus status,
        @Schema(description = "Thời điểm tạo") Instant createdAt,
        @Schema(description = "Hạn thanh toán (createdAt + 10 phút)") Instant paymentDeadline,
        @Schema(description = "Thời điểm thanh toán thành công đã xác minh") Instant paidAt,
        @Schema(description = "Thời điểm xác nhận booking") Instant confirmedAt,
        @Schema(description = "Thời điểm hoàn thành trải nghiệm") Instant completedAt,
        @Schema(description = "Lý do hủy") String cancellationReason,
        @Schema(description = "Các slot đã giữ") List<SlotHoldResponse> slotHolds
) {
    public static BookingResponse fromEntity(Booking b) {
        if (b == null) return null;

        List<SlotHoldResponse> holds = b.getSlotHolds() == null
                ? List.of()
                : b.getSlotHolds().stream().map(SlotHoldResponse::fromEntity).toList();

        return BookingResponse.builder()
                .id(b.getId())
                .bookingCode(b.getBookingCode())
                .touristId(b.getTourist() != null ? b.getTourist().getId() : null)
                .touristName(b.getTourist() != null ? b.getTourist().getFullName() : null)
                .tourId(b.getTour() != null ? b.getTour().getTourId() : null)
                .tourTitle(b.getTour() != null ? b.getTour().getTitle() : null)
                .experienceDate(b.getExperienceDate())
                .totalAmount(b.getTotalAmount())
                .currency(b.getCurrency())
                .status(b.getStatus())
                .createdAt(b.getCreatedAt())
                .paymentDeadline(b.getPaymentDeadline())
                .paidAt(b.getPaidAt())
                .confirmedAt(b.getConfirmedAt())
                .completedAt(b.getCompletedAt())
                .cancellationReason(b.getCancellationReason())
                .slotHolds(holds)
                .build();
    }
}
