package com.journeygo.modules.booking.service;

import com.journeygo.modules.auth.event.UserAuthenticatedEvent;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Nghe sự kiện "user vừa đăng nhập / đăng ký" ⇒ đưa lời mời tham gia tour
 * (gửi tới chính email này) vào trung tâm thông báo của app.
 *
 * <p>⚠️ Vì sao KHÔNG dùng {@code @TransactionalEventListener(AFTER_COMMIT)}?
 * Ở {@code AFTER_COMMIT}, mọi lời gọi {@code @Transactional} với mặc định
 * {@code REQUIRED} sẽ "tham gia" vào giao dịch ĐÃ COMMIT XONG ⇒ bản ghi thông báo
 * không bao giờ được ghi xuống DB ⇒ trung tâm thông báo của người được mời trống.
 *
 * <p>⇒ Ở đây listener chạy ĐỒNG BỘ ngay trong giao dịch đăng nhập/đăng ký.
 * Thông báo được tạo qua {@code NotificationPublisher} ⇒
 * {@code NotificationEventListener} ghi bản ghi ở {@code AFTER_COMMIT} của chính
 * giao dịch đó (đúng pattern của toàn hệ thống) ⇒ không bao giờ mất thông báo.
 *
 * <p>Lỗi ở đây chỉ ghi log, không làm hỏng luồng đăng nhập.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class BookingInvitationAuthListener {

    private final BookingInvitationNotificationService invitationNotificationService;

    @EventListener
    public void onUserAuthenticated(UserAuthenticatedEvent event) {
        try {
            int created = invitationNotificationService
                    .notifyPendingInvitations(event.userId(), event.email());
            if (created > 0) {
                log.info("Đã đưa {} lời mời tour vào thông báo của user={}", created, event.userId());
            }
        } catch (Exception e) {
            log.warn("[Booking] Không tạo được thông báo lời mời tour cho user {}: {}",
                    event.userId(), e.getMessage());
        }
    }
}
