package com.journeygo.modules.auth.event;

/**
 * Sự kiện "người dùng vừa đăng nhập / đăng ký thành công".
 *
 * <p>Phát ra sau khi giao dịch đăng nhập/đăng ký commit. Các module khác (VD: booking)
 * lắng nghe sự kiện này để làm việc cần biết user id + email — ví dụ: tìm các lời
 * mời tham gia tour đã gửi tới email này và đưa vào trung tâm thông báo của app.
 */
public record UserAuthenticatedEvent(Long userId, String email) {
}
