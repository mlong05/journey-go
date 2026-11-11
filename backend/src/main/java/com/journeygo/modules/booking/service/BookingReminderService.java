package com.journeygo.modules.booking.service;

import com.journeygo.modules.auth.service.EmailService;
import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.BookingPassenger;
import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.booking.repository.BookingPassengerRepository;
import com.journeygo.modules.booking.repository.BookingRepository;
import com.journeygo.modules.notification.entity.enums.NotificationType;
import com.journeygo.modules.notification.service.NotificationPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;

/**
 * Nhắc nhở trước ngày trải nghiệm (1–2 ngày).
 *
 * <p>Gửi cho:
 * <ul>
 *   <li>Người đặt tour (Booking Customer) — thông báo trong app + email.</li>
 *   <li>Các hành khách đã liên kết tài khoản — thông báo trong app.</li>
 * </ul>
 *
 * <p>Mỗi booking chỉ gửi nhắc một lần ({@code reminderSentAt}).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BookingReminderService {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    /** Số ngày trước ngày trải nghiệm mà bắt đầu gửi nhắc. */
    public static final int REMINDER_DAYS = 2;

    private final BookingRepository bookingRepository;
    private final BookingPassengerRepository passengerRepository;
    private final NotificationPublisher notificationPublisher;
    private final EmailService emailService;

    /**
     * Quét các booking sắp đến ngày trải nghiệm và gửi nhắc nhở.
     *
     * @return số booking đã gửi nhắc
     */
    @Transactional
    public int sendUpcomingReminders() {
        LocalDate today = LocalDate.now(VIETNAM_ZONE);
        LocalDate until = today.plusDays(REMINDER_DAYS);

        List<Booking> bookings = bookingRepository.findUpcomingForReminder(
                today, until, List.of(BookingStatus.CONFIRMED));

        int count = 0;
        for (Booking booking : bookings) {
            try {
                sendReminder(booking, today);
                count++;
            } catch (Exception ex) {
                log.error("Không gửi được nhắc nhở cho booking {}: {}", booking.getId(), ex.getMessage(), ex);
            }
        }
        if (count > 0) {
            log.info("[BookingReminder] Đã gửi {} nhắc nhở trước ngày trải nghiệm", count);
        }
        return count;
    }

    /**
     * Gửi nhắc nhở cho một booking cụ thể.
     */
    private void sendReminder(Booking booking, LocalDate today) {
        LocalDate experienceDate = booking.getExperienceDate();
        if (experienceDate == null) {
            return;
        }
        long daysLeft = java.time.temporal.ChronoUnit.DAYS.between(today, experienceDate);
        String tourTitle = booking.getTour() != null ? booking.getTour().getTitle() : "tour của bạn";

        // ── Thông báo trong app cho người đặt + hành khách đã có tài khoản ──
        List<Long> recipients = passengerRepository
                .findByBooking_IdOrderByCreatedAtAsc(booking.getId()).stream()
                .map(BookingPassenger::getLinkedUserId)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();

        if (booking.getTourist() != null && !recipients.contains(booking.getTourist().getId())) {
            recipients = java.util.stream.Stream.concat(
                    java.util.stream.Stream.of(booking.getTourist().getId()),
                    recipients.stream()).toList();
        }

        for (Long userId : recipients) {
            notificationPublisher.send(NotificationType.TOUR_REMINDER)
                    .to(userId)
                    .title("Sắp đến ngày trải nghiệm “" + tourTitle + "”")
                    .body("Ngày trải nghiệm của bạn là " + experienceDate
                            + " (" + daysLeft + " ngày nữa). Hãy chuẩn bị hành lý và sắp xếp lịch nhé!")
                    .link("/bookings/" + booking.getId())
                    .ref("BOOKING", booking.getId())
                    .publish();
        }

        // ── Email cho người đặt ───────────────────────────────────────────────
        if (booking.getTourist() != null && booking.getTourist().getEmail() != null) {
            sendEmail(booking, tourTitle, experienceDate, daysLeft,
                    booking.getTourist().getEmail(), booking.getTourist().getFullName());
        }

        booking.setReminderSentAt(Instant.now());
        bookingRepository.save(booking);
    }

    /** Gửi email nhắc nhở. */
    private void sendEmail(Booking booking, String tourTitle, LocalDate experienceDate,
                           long daysLeft, String email, String fullName) {
        try {
            String html = """
                    <!DOCTYPE html>
                    <html lang="vi">
                    <head><meta charset="UTF-8"></head>
                    <body style="font-family:'Segoe UI',Tahoma,sans-serif;background:#f8fafc;padding:24px;">
                      <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e2e8f0;overflow:hidden;">
                        <div style="background:linear-gradient(135deg,#0d9488,#0f766e);padding:28px;text-align:center;color:#fff;">
                          <h1 style="margin:0;font-size:22px;">JourneyGo</h1>
                          <p style="margin:6px 0 0;font-size:14px;opacity:.9;">Nhắc nhở chuyến đi</p>
                        </div>
                        <div style="padding:28px;color:#334155;line-height:1.6;">
                          <p>Xin chào <strong>{{fullName}}</strong>,</p>
                          <p>Chuyến đi <strong>{{tourTitle}}</strong> của bạn còn <strong>{{daysLeft}} ngày</strong>
                             nữa (ngày <strong>{{experienceDate}}</strong>).</p>
                          <p>Mã đơn: <strong>{{bookingCode}}</strong></p>
                          <p>Vui lòng sắp xếp lịch và chuẩn bị hành lý để có trải nghiệm tốt nhất.</p>
                        </div>
                      </div>
                    </body>
                    </html>
                    """;
            html = html.replace("{{fullName}}", fullName == null ? "" : fullName)
                    .replace("{{tourTitle}}", tourTitle)
                    .replace("{{daysLeft}}", String.valueOf(daysLeft))
                    .replace("{{experienceDate}}", experienceDate.toString())
                    .replace("{{bookingCode}}", booking.getBookingCode());
            emailService.sendHtml(email, "Nhắc nhở: chuyến đi “" + tourTitle + "” sắp tới", html);
        } catch (Exception ex) {
            log.error("Không gửi được email nhắc nhở tới {}: {}", email, ex.getMessage());
        }
    }
}
