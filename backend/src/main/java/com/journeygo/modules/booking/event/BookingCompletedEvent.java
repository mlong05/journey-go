package com.journeygo.modules.booking.event;

import java.time.Instant;

/**
 * Sự kiện Booking được đánh dấu hoàn thành trải nghiệm.
 *
 * <p>Được phát ra khi trải nghiệm của một Booking hoàn tất (Journey kết thúc) hoặc khi
 * Admin xác nhận hoàn thành thủ công.
 *
 * <p>Ý nghĩa nghiệp vụ: từ thời điểm này, doanh thu Partner phát sinh từ Booking đó bắt đầu
 * được xét điều kiện tất toán (Mục 5 tài liệu — 9 điều kiện lọc).
 *
 * @param bookingId   ID Booking
 * @param completedAt Thời điểm hoàn thành trải nghiệm
 */
public record BookingCompletedEvent(Long bookingId, Instant completedAt) {
}
