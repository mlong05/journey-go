package com.journeygo.modules.partnerprofileupdate.entity.enums;

/**
 * Trạng thái vòng đời của yêu cầu đổi thông tin đối tác.
 *
 * <pre>
 * PENDING ──(Admin duyệt)──► APPROVED   → ghi đè vào hồ sơ chính thức
 *         │
 *         └──(Admin từ chối)─► REJECTED  → giữ nguyên hồ sơ cũ, hiển thị lý do
 * </pre>
 */
public enum PartnerProfileUpdateStatus {
    /** Đang chờ Admin xử lý. */
    PENDING,
    /** Đã duyệt — thông tin mới đã được ghi đè vào hồ sơ chính thức. */
    APPROVED,
    /** Bị từ chối — kèm lý do bắt buộc. */
    REJECTED;

    public boolean isOpen() {
        return this == PENDING;
    }
}
