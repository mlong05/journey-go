package com.journeygo.modules.tour.entity.enums;

/**
 * Trạng thái tour.
 *
 * <pre>
 * DRAFT ──gửi duyệt──▶ PENDING_REVIEW ──duyệt──▶ PUBLISHED ◀──▶ PAUSED
 *   ▲                     │      │
 *   │                     │      └─từ chối──▶ REJECTED (nhân bản thành bản nháp mới)
 *   │                     └─yêu cầu sửa──▶ CHANGES_REQUESTED ──gửi lại──▶ PENDING_REVIEW
 * </pre>
 */
public enum TourStatus {
    /** Bản nháp: sửa mọi thứ, xóa được. */
    DRAFT,
    /** Đang chờ Moderator duyệt: nội dung bị khóa (BR-03). */
    PENDING_REVIEW,
    /** Moderator yêu cầu chỉnh sửa: sửa theo ghi chú rồi gửi lại. */
    CHANGES_REQUESTED,
    /** Bị từ chối: chỉ xem lý do, có thể nhân bản thành bản nháp mới. */
    REJECTED,
    /** Đã duyệt, đang bán: được tạm ngừng, sửa giá và lịch. */
    PUBLISHED,
    /** Tạm ngừng bán: mở bán lại được. */
    PAUSED;

    /** Đối tác được sửa nội dung tour ở trạng thái này. */
    public boolean isContentEditable() {
        return this == DRAFT || this == CHANGES_REQUESTED;
    }

    /** Đối tác được sửa giá / lịch ở trạng thái này (BR-05). */
    public boolean isPricingEditable() {
        return isContentEditable() || this == PUBLISHED || this == PAUSED;
    }
}
