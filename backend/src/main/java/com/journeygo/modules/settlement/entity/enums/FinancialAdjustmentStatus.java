package com.journeygo.modules.settlement.entity.enums;

/**
 * Trạng thái khoản điều chỉnh tài chính.
 */
public enum FinancialAdjustmentStatus {
    /** Đã ghi nhận, chờ phê duyệt. */
    PENDING,
    /** Đã được phê duyệt và áp dụng vào Wallet. */
    APPROVED,
    /** Bị từ chối. */
    REJECTED
}
