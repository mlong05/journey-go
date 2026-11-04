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
        public static final String DESTINATION_REQUEST_REVIEW = "destination-request-review";
        public static final String DESTINATION_REQUEST_ASSIGNMENT = "destination-request-assignment";
        public static final String DESTINATION_REQUEST_CONTENT = "destination-request-content";
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
        boolean admin = owner != null && owner.getRole() != null && owner.getRole().isAdmin();
        return (admin ? "/admin" : "/provider") + suffix;
    }

    public static Long idOf(com.journeygo.modules.user.entity.User user) {
        return user == null ? null : user.getId();
    }

    /** Đặt tên trong ngoặc kép tiếng Việt, cắt bớt nếu quá dài. */
    public static String quote(String name) {
        if (name == null || name.isBlank()) return "“(chưa đặt tên)”";
        String trimmed = name.trim();
        return "“" + (trimmed.length() > 80 ? trimmed.substring(0, 79) + "…" : trimmed) + "”";
    }

    /** Định dạng tiền kiểu Việt Nam: 1.500.000 đ. */
    public static String money(java.math.BigDecimal amount) {
        if (amount == null) return "0 đ";
        java.text.DecimalFormatSymbols symbols = new java.text.DecimalFormatSymbols(java.util.Locale.ROOT);
        symbols.setGroupingSeparator('.');
        return new java.text.DecimalFormat("#,##0", symbols).format(amount) + " đ";
    }

    /** Ghép câu chính với ghi chú của người duyệt (nếu có). */
    public static String withNote(String sentence, String note) {
        return note == null || note.isBlank() ? sentence : sentence + " Ghi chú: " + note.trim();
    }

    /** Báo cho cả vai trò rằng một hàng chờ vừa thay đổi (không tạo thông báo). */
    public void queueChanged(String role, String queue) {
        eventPublisher.publishEvent(new QueueChangedEvent(role, queue));
    }

    public final class Builder {
        private final NotificationType type;
        private final Set<Long> recipients = new LinkedHashSet<>();
        private String role;
        private Long exclude;
        private String title;
        private String body;
        private String link;
        private String refType;
        private Long refId;
        private String queue;

        private Builder(NotificationType type) {
            this.type = type;
        }

        /** Người nhận cụ thể; null được bỏ qua (ví dụ hồ sơ không có người tạo). */
        public Builder to(Long userId) {
            if (userId != null) recipients.add(userId);
            return this;
        }

        public Builder toRole(String role) {
            this.role = role;
            return this;
        }

        public Builder except(Long userId) {
            this.exclude = userId;
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

        public Builder ref(String refType, Long refId) {
            this.refType = refType;
            this.refId = refId;
            return this;
        }

        public Builder queue(String queue) {
            this.queue = queue;
            return this;
        }

        public void publish() {
            if (recipients.isEmpty() && role == null) return;
            eventPublisher.publishEvent(new NotificationEvent(Set.copyOf(recipients), role, exclude, type,
                    title, body, link, refType, refId, queue));
        }
    }
}
