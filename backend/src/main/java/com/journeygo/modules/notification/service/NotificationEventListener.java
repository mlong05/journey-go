package com.journeygo.modules.notification.service;

import com.journeygo.modules.notification.event.NotificationEvent;
import com.journeygo.modules.notification.event.QueueChangedEvent;
import com.journeygo.modules.user.entity.Role;

import java.util.Set;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Nhận sự kiện thông báo SAU KHI giao dịch nghiệp vụ commit ({@code fallbackExecution}: vẫn chạy khi
 * nơi phát không có giao dịch). Lỗi ở đây chỉ ghi log, không bao giờ làm hỏng nghiệp vụ đã xong.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class NotificationEventListener {

    /** Hàng chờ thẩm định mà thẻ "Yêu cầu cần phê duyệt" ở tổng quan Admin cũng đếm. */
    private static final Set<String> ADMIN_ALSO_WATCHES = Set.of(
            NotificationPublisher.Queue.DESTINATION_REVIEW, NotificationPublisher.Queue.TOUR_REVIEW);

    private final NotificationService notificationService;

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onNotification(NotificationEvent event) {
        try {
            notificationService.deliver(event);
            mirrorToAdmin(event.recipientRole(), event.queue());
        } catch (Exception e) {
            log.error("[Notification] Không gửi được thông báo {}: {}", event.type(), e.getMessage(), e);
        }
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onQueueChanged(QueueChangedEvent event) {
        try {
            notificationService.pushQueueChanged(event.recipientRole(), event.queue());
            mirrorToAdmin(event.recipientRole(), event.queue());
        } catch (Exception e) {
            log.warn("[Notification] Không đẩy được queue-changed {}: {}", event.queue(), e.getMessage());
        }
    }

    private void mirrorToAdmin(String role, String queue) {
        if (queue != null && Role.MODERATOR.equals(role) && ADMIN_ALSO_WATCHES.contains(queue)) {
            notificationService.pushQueueChanged(Role.ADMIN, queue);
        }
    }
}
