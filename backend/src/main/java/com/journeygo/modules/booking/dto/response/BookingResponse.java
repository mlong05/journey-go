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
        @Schema(description = "ID người đặt (Booking Customer)") Long touristId,
        @Schema(description = "Tên người đặt") String touristName,
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
        @Schema(description = "Các slot đã giữ") List<SlotHoldResponse> slotHolds,
        @Schema(description = "Số slot đã giữ (bằng số hành khách chiếm slot)") int slotCount,
        @Schema(description = "Danh sách hành khách trong nhóm") List<BookingPassengerResponse> passengers,
        @Schema(description = "Số hành khách trong nhóm") int passengerCount,
        @Schema(description = "Số hành khách còn hiệu lực") int activePassengerCount,
        @Schema(description = "Tour đã bắt đầu chưa (ngày trải nghiệm đã tới)") boolean experienceStarted,
        @Schema(description = "Số ngày còn lại tới ngày trải nghiệm (0 nếu đã qua)") long daysUntilExperience
) {
    public static BookingResponse fromEntity(Booking b) {
        return fromEntity(b, null, null, null);
    }

    /**
     * Mapping đầy đủ.
     *
     * @param passengers   danh sách hành khách (null = lấy từ entity, lazy-safe)
     * @param invitations  danh sách lời mời (null = không kèm)
     */
    public static BookingResponse fromEntity(Booking b,
                                             List<BookingPassengerResponse> passengers,
                                             List<InvitationResponse> invitations,
                                             java.time.Instant now) {
        if (b == null) return null;

        List<SlotHoldResponse> holds = resolveSlotHolds(b);

        List<BookingPassengerResponse> passengerList = passengers != null
                ? passengers
                : resolvePassengers(b);

        int activeCount = (int) passengerList.stream()
                .filter(p -> p.status() == com.journeygo.modules.booking.entity.enums.BookingPassengerStatus.ACTIVE)
                .count();

        Instant ref = now != null ? now : Instant.now();
        LocalDate today = java.time.LocalDate.ofInstant(ref, java.time.ZoneId.of("Asia/Ho_Chi_Minh"));
        boolean started = b.getExperienceDate() != null && !b.getExperienceDate().isAfter(today);
        long daysUntil = b.getExperienceDate() == null
                ? 0
                : java.time.temporal.ChronoUnit.DAYS.between(today, b.getExperienceDate());

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
                .slotCount(b.getSlotCount())
                .passengers(passengerList)
                .passengerCount(passengerList.size())
                .activePassengerCount(activeCount)
                .experienceStarted(started)
                .daysUntilExperience(Math.max(0, daysUntil))
                .build();
    }

    /**
     * Đọc collection {@code slotHolds} của Booking — an toàn với lazy loading.
     *
     * <p>⚠️ Vì sao cần bọc try/catch?
     * {@code Booking.slotHolds} là {@code @OneToMany(fetch = LAZY)}. Nếu entity đã bị
     * DETACH khỏi PersistenceContext (VD do một câu bulk UPDATE có
     * {@code clearAutomatically = true} chạy trước đó trong cùng transaction) thì
     * truy cập collection sẽ ném
     * {@code LazyInitializationException: could not initialize proxy - no Session}.
     *
     * <p>⇒ Ta bắt lỗi đó và trả về danh sách RỖNG thay vì làm hỏng cả request
     * (thông tin slot hold không quan trọng bằng việc hủy đơn thành công).
     */
    private static List<SlotHoldResponse> resolveSlotHolds(Booking b) {
        try {
            if (b.getSlotHolds() == null) {
                return List.of();
            }
            return b.getSlotHolds().stream().map(SlotHoldResponse::fromEntity).toList();
        } catch (RuntimeException ex) {
            // LazyInitializationException hoặc lỗi tương tự ⇒ bỏ qua phần slot hold.
            return List.of();
        }
    }

    /** Đọc danh sách hành khách — lazy-safe (bỏ qua nếu entity đã detach). */
    private static List<BookingPassengerResponse> resolvePassengers(Booking b) {
        try {
            if (b.getPassengers() == null) {
                return List.of();
            }
            return b.getPassengers().stream()
                    .map(p -> BookingPassengerResponse.fromEntity(p, b.getExperienceDate()))
                    .toList();
        } catch (RuntimeException ex) {
            return List.of();
        }
    }
}
