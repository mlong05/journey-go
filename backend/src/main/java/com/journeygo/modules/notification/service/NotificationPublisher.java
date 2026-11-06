package com.journeygo.modules.notification.service;

import com.journeygo.modules.notification.entity.enums.NotificationType;
import com.journeygo.modules.notification.event.NotificationEvent;
import com.journeygo.modules.notification.event.QueueChangedEvent;
import lombok.RequiredArgsConstructor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Component;

import java.util.LinkedHashSet;
import java.util.Set;

/**
 * Điểm vào duy nhất để các service nghiệp vụ gửi thông báo. Chỉ phát sự kiện; việc lưu và đẩy
 * qua SSE do {@link NotificationEventListener} làm sau khi giao dịch commit.
 *
 * <pre>
 * notifications.send(NotificationType.TOUR_APPROVED)
 *         .to(ownerId)
 *         .title("Tour đã được duyệt")
 *         .body("“Hành trình Tràng An” đã được phát hành.")
 *         .link("/provider/tours")
 *         .ref("TOUR", tourId)
 *         .publish();
 * </pre>
 */
@Component
@RequiredArgsConstructor
public class NotificationPublisher {

    /** Tên hàng chờ dùng chung giữa backend, web và app. */
    public static final class Queue {
        public static final String DESTINATION_REVIEW = "destination-review";
        public static final String TOUR_REVIEW = "tour-review";
        public static final String CONTENT_REVIEW = "content-review";
        public static final String EXPERIENCE_REVIEW = "experience-review";
        public static final String POST_REVIEW = "post-review";
        public static final String POST_REPORT = "post-report";
        public static final String REFUND_REVIEW = "refund-review";
        public static final String ADJUSTMENT_REVIEW = "adjustment-review";
        public static final String BOOKINGS = "bookings";
        public static final String SETTLEMENTS = "settlements";
        public static final String REFUNDS = "refunds";
        public static final String MY_CONTENT = "my-content";

        private Queue() {
        }
    }

    private final ApplicationEventPublisher eventPublisher;

    public Builder send(NotificationType type) {
        return new Builder(type);
    }

    /** Trang quản lý của chủ hồ sơ: Admin tạo thay hệ thống thì về /admin, còn lại về /provider. */
    public static String dashboardPath(com.journeygo.modules.user.entity.User owner, String suffix) {
        if (owner == null) return "/provider" + suffix;
        return (owner.getRole() == com.journeygo.modules.user.entity.Role.ADMIN ? "/admin" : "/provider") + suffix;
    }

    /** Phát sự kiện SSE để web/app cập nhật số đếm hàng chờ thời gian thực. */
    public void notifyQueueChanged(String queueName) {
        eventPublisher.publishEvent(new QueueChangedEvent(this, queueName));
    }

    public class Builder {
        private final NotificationType type;
        private final Set<Long> recipientIds = new LinkedHashSet<>();
        private String title;
        private String body;
        private String link;
        private String referenceType;
        private Long referenceId;
        private String queueToNotify;

        private Builder(NotificationType type) {
            this.type = type;
        }

        public Builder to(Long recipientId) {
            if (recipientId != null) recipientIds.add(recipientId);
            return this;
        }

        public Builder toAll(Iterable<Long> ids) {
            if (ids != null) {
                for (Long id : ids) {
                    if (id != null) recipientIds.add(id);
                }
            }
            return this;
        }

        public Builder title(String title) {
            this.title = title;
            return this;
        }

        public Builder body(String body) {
            this.body = body;
            return this;
        }

        public Builder link(String link) {
            this.link = link;
            return this;
        }

        public Builder ref(String type, Long id) {
            this.referenceType = type;
            this.referenceId = id;
            return this;
        }

        /**
         * Phát cả QueueChangedEvent cho hàng chờ kiểm duyệt tương ứng để bell badge cập nhật ngay.
         * Dùng hằng số từ {@link Queue}.
         */
        public Builder notifyQueue(String queueName) {
            this.queueToNotify = queueName;
            return this;
        }

        public void publish() {
            if (title == null || title.isBlank()) {
                throw new IllegalStateException("Notification title is required");
            }
            for (Long recipientId : recipientIds) {
                eventPublisher.publishEvent(new NotificationEvent(
                        NotificationPublisher.this,
                        recipientId,
                        type,
                        title,
                        body,
                        link,
                        referenceType,
                        referenceId
                ));
            }
            if (queueToNotify != null && !queueToNotify.isBlank()) {
                notifyQueueChanged(queueToNotify);
            }
        }
    }
}
