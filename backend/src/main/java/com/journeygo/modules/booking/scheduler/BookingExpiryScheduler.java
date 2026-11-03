package com.journeygo.modules.booking.scheduler;

import com.journeygo.modules.booking.service.BookingService;
import com.journeygo.modules.finance.config.FinanceProperties;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

/**
 * Tác vụ nền quét các Booking quá hạn thanh toán 10 phút (UC-01).
 *
 * <p>Vòng lặp:
 * <ol>
 *   <li>Booking vẫn {@code PENDING_PAYMENT} và {@code paymentDeadline <= now}.</li>
 *   <li>Chuyển sang {@code EXPIRED} và giải phóng slot đã giữ (đúng một lần).</li>
 * </ol>
 *
 * <p>Khóa pessimistic write được dùng để đảm bảo không xảy ra tình trạng vừa giải phóng
 * chỗ vừa xác nhận Booking (ghi chú "Điểm cần lưu ý" của UC-01).
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BookingExpiryScheduler {

    private final BookingService bookingService;
    private final FinanceProperties financeProperties;

    /**
     * Quét Booking quá hạn thanh toán.
     *
     * <p>⚠️ Bắt buộc chỉ rõ {@code timeUnit = TimeUnit.SECONDS}. Nếu để mặc định,
     * Spring hiểu giá trị số thuần của {@code fixedDelayString} là **MILI-GIÂY**
     * ⇒ 60 nghĩa là 60ms ⇒ quét toàn bộ bảng booking liên tục, gây tải DB.
     */
    @Scheduled(fixedDelayString = "${app.finance.booking-expiry-scan-interval-seconds:60}",
            initialDelayString = "${app.finance.booking-expiry-scan-interval-seconds:60}",
            timeUnit = TimeUnit.SECONDS)
    public void expireOverdueBookings() {
        try {
            int expired = bookingService.expireOverdueBookings();
            if (expired > 0) {
                log.info("[BookingExpiry] Đã chuyển {} booking quá hạn sang EXPIRED và giải phóng slot", expired);
            }
        } catch (Exception e) {
            log.error("[BookingExpiry] Lỗi khi quét booking quá hạn: {}", e.getMessage(), e);
        }
    }

    /** Chu kỳ quét hiện tại (giây) — dùng cho mô tả/monitoring. */
    public long scanIntervalSeconds() {
        return financeProperties.getBookingExpiryScanIntervalSeconds();
    }
}
