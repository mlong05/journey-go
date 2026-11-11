package com.journeygo.modules.booking.entity.enums;

/**
 * Trạng thái yêu cầu thay đổi hành khách.
 *
 * <ul>
 *   <li>{@link #PENDING} — người đặt đã gửi yêu cầu, chờ đối tác xử lý.</li>
 *   <li>{@link #APPROVED} — đối tác đã duyệt và áp dụng thay đổi.</li>
 *   <li>{@link #REJECTED} — đối tác từ chối.</li>
 * </ul>
 */
public enum PassengerChangeStatus {
    PENDING,
    APPROVED,
    REJECTED;
}
