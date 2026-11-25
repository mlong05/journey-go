package com.journeygo.modules.tourrequest.entity.enums;

/**
 * Trạng thái yêu cầu tạo tour riêng của du khách:
 * OPEN ──(CP nhận)──▶ ACCEPTED ──(Tạo tour xong)──▶ FULFILLED
 *   │
 *   ├──(Du khách hủy)──▶ CANCELLED
 *   └──(Hết hạn)──▶ EXPIRED
 */
public enum TourRequestStatus {
    /** Đang mở, chờ đối tác (Content Provider) nhận. */
    OPEN,
    /** Đã được đối tác nhận, đang tiến hành thiết kế/tạo tour customize. */
    ACCEPTED,
    /** Đã hoàn thành (đối tác đã tạo tour và gửi tới du khách). */
    FULFILLED,
    /** Du khách đã hủy yêu cầu (chỉ khi còn OPEN). */
    CANCELLED,
    /** Yêu cầu đã hết hạn. */
    EXPIRED
}
