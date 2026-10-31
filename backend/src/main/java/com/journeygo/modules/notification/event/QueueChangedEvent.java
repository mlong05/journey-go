package com.journeygo.modules.notification.event;

/**
 * Một hàng chờ đổi số lượng (ví dụ moderator khác vừa duyệt xong một hồ sơ) — chỉ đẩy tín hiệu
 * "queue-changed" qua SSE cho vai trò liên quan để trang đang mở tự tải lại, không lưu thông báo.
 */
public record QueueChangedEvent(String recipientRole, String queue) {
}
