package com.journeygo.modules.booking.entity.enums;

/**
 * Trạng thái vòng đời Booking.
 *
 * <p>Diễn giải theo tài liệu nghiệp vụ "Booking - Payment - Refund - Wallet &amp; Settlement":
 * <ul>
 *   <li>{@code PENDING_PAYMENT} — Booking vừa tạo, đã giữ slot, đang chờ thanh toán.</li>
 *   <li>{@code CONFIRMED} — Thanh toán đã được xác minh thành công, mở quyền sử dụng tour.</li>
 *   <li>{@code EXPIRED} — Quá thời hạn thanh toán 10 phút, slot đã được giải phóng.</li>
 *   <li>{@code CANCELLED} — Bị hủy hợp lệ (bởi Tourist hoặc Admin), slot đã được giải phóng.</li>
 *   <li>{@code COMPLETED} — Trải nghiệm đã hoàn thành — điều kiện để doanh thu Partner đủ tư cách tất toán.</li>
 * </ul>
 */
public enum BookingStatus {
    PENDING_PAYMENT,
    CONFIRMED,
    EXPIRED,
    CANCELLED,
    COMPLETED;

    /** Booking đang giữ slot và chờ thanh toán. */
    public boolean isPendingPayment() {
        return this == PENDING_PAYMENT;
    }

    /** Booking đã được thanh toán hợp lệ. */
    public boolean isPaid() {
        return this == CONFIRMED || this == COMPLETED;
    }

    /** Booking đã kết thúc vòng đời giữ slot — dùng để giải phóng slot đúng một lần. */
    public boolean isTerminalForSlot() {
        return this == EXPIRED || this == CANCELLED;
    }
}
