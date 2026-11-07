package com.journeygo.modules.partnerapplication.entity.enums;

/**
 * Trạng thái vòng đời của đơn đăng ký trở thành đối tác.
 *
 * <pre>
 * DRAFT ──(gửi đơn)──► PENDING ──(duyệt)──► APPROVED
 *                        │
 *                        └──(từ chối)──► REJECTED ──(sửa & gửi lại)──► PENDING
 * </pre>
 */
public enum PartnerApplicationStatus {
    /** Nháp — người đăng ký đang điền, chưa gửi. */
    DRAFT,
    /** Đã gửi — đang chờ Admin kiểm duyệt. */
    PENDING,
    /** Đã được duyệt — tài khoản CONTENT_PROVIDER đã được cấp. */
    APPROVED,
    /** Bị từ chối — kèm lý do bắt buộc. */
    REJECTED;

    public boolean isEditable() {
        return this == DRAFT || this == REJECTED;
    }
}
