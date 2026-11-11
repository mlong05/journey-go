package com.journeygo.modules.booking.entity.enums;

/**
 * Loại slot được giữ cho một Booking.
 *
 * <ul>
 *   <li>{@link #TOUR} — slot của tour (theo ngày khởi hành, sức chứa do đối tác thiết lập).
 *       Đây là loại dùng cho tour luồng 5 bước — cấu trúc tour hiện hành.</li>
 *   <li>{@link #EXPERIENCE} — slot của Experience (theo ngày, sức chứa {@code maxTourPerDay}).
 *       Giữ cho các tour luồng cũ vẫn còn dữ liệu trải nghiệm.</li>
 * </ul>
 */
public enum BookingSlotType {
    /** Giữ chỗ trên TourSlot — sức chứa theo ngày khởi hành của tour. */
    TOUR,
    /** Giữ chỗ trên Experience (có giới hạn sức chứa theo ngày). */
    EXPERIENCE
}
