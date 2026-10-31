package com.journeygo.modules.notification.event;

import com.journeygo.modules.notification.entity.enums.NotificationType;

import java.util.Set;

/**
 * Yêu cầu gửi thông báo, được xử lý SAU KHI giao dịch nghiệp vụ commit
 * (rollback thì không có thông báo sai).
 *
 * @param recipientIds  người nhận cụ thể (có thể rỗng)
 * @param recipientRole gửi cho mọi tài khoản đang hoạt động thuộc vai trò này (có thể null)
 * @param excludeUserId bỏ qua người này, thường là người vừa thao tác (có thể null)
 * @param queue         tên hàng chờ vừa thay đổi để các trang đang mở tự tải lại (có thể null)
 */
public record NotificationEvent(
        Set<Long> recipientIds,
        String recipientRole,
        Long excludeUserId,
        NotificationType type,
        String title,
        String body,
        String link,
        String refType,
        Long refId,
        String queue
) {
}
