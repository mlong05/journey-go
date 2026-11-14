package com.journeygo.modules.partnerprofileupdate.entity.enums;

/**
 * Hành động trong lịch sử thay đổi thông tin đối tác.
 */
public enum PartnerProfileUpdateAction {
    /** Đối tác gửi yêu cầu đổi thông tin. */
    SUBMITTED,
    /** Admin duyệt — thông tin mới được ghi đè vào hồ sơ chính thức. */
    APPROVED,
    /** Admin từ chối — hồ sơ cũ được giữ nguyên. */
    REJECTED
}
