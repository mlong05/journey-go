package com.journeygo.modules.partnerapplication.entity.enums;

/**
 * Hành động trong lịch sử kiểm duyệt đơn đăng ký đối tác.
 */
public enum PartnerApplicationAction {
    /** Người đăng ký gửi đơn (DRAFT → PENDING). */
    SUBMITTED,
    /** Admin duyệt (PENDING → APPROVED). */
    APPROVED,
    /** Admin từ chối (PENDING → REJECTED). */
    REJECTED,
    /** Người đăng ký sửa & gửi lại sau khi bị từ chối (REJECTED → PENDING). */
    RESUBMITTED
}
