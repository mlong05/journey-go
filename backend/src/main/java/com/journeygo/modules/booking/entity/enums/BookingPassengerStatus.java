package com.journeygo.modules.booking.entity.enums;

/**
 * Trạng thái của một hành khách trong Booking.
 *
 * <ul>
 *   <li>{@link #ACTIVE} — hành khách đang có hiệu lực, được quyền truy cập tour.</li>
 *   <li>{@link #REPLACED} — đã bị thay bằng hành khách khác (giữ lại lịch sử).</li>
 *   <li>{@link #REVOKED} — đối tác đã thu hồi quyền truy cập tour của hành khách này.</li>
 * </ul>
 */
public enum BookingPassengerStatus {
    ACTIVE,
    REPLACED,
    REVOKED;

    /** Hành khách còn hiệu lực (được xem tour / truy cập trải nghiệm). */
    public boolean isActive() {
        return this == ACTIVE;
    }
}
