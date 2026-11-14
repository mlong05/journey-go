package com.journeygo.modules.booking.scheduler;

import com.journeygo.modules.booking.service.BookingReminderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.util.concurrent.TimeUnit;

/**
 * Tác vụ nền gửi nhắc nhở trước ngày trải nghiệm 1–2 ngày.
 *
 * <p>Chạy 1 lần/ngày (mặc định 08:00 theo giờ VN) — đủ để không bỏ sót booking.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BookingReminderScheduler {

    private final BookingReminderService reminderService;

    /**
     * Quét booking sắp đến ngày trải nghiệm và gửi nhắc nhở.
     */
    @Scheduled(cron = "${app.booking.reminder-cron:0 0 8 * * *}", zone = "Asia/Ho_Chi_Minh")
    public void sendUpcomingReminders() {
        try {
            reminderService.sendUpcomingReminders();
        } catch (Exception e) {
            log.error("[BookingReminder] Lỗi khi gửi nhắc nhở trước ngày trải nghiệm: {}", e.getMessage(), e);
        }
    }

    /**
     * Quét bổ sung mỗi 6 giờ — bảo đảm booking tạo muộn vẫn nhận được nhắc nhở.
     */
    @Scheduled(fixedDelayString = "${app.booking.reminder-scan-interval-seconds:21600}",
            initialDelayString = "PT30M",
            timeUnit = TimeUnit.SECONDS)
    public void rescanUpcomingReminders() {
        try {
            reminderService.sendUpcomingReminders();
        } catch (Exception e) {
            log.error("[BookingReminder] Lỗi khi quét lại nhắc nhở: {}", e.getMessage(), e);
        }
    }
}
