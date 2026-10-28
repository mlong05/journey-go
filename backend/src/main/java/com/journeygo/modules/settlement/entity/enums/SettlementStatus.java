package com.journeygo.modules.settlement.entity.enums;

/**
 * Trạng thái Settlement (đợt tất toán).
 *
 * <p>Ảnh hưởng tới Wallet:
 * <ul>
 *   <li>{@link #DRAFT} — không thay đổi số dư.</li>
 *   <li>{@link #APPROVED} — cộng tiền vào Wallet.</li>
 *   <li>{@link #REJECTED} — không thay đổi số dư, giải phóng các khoản doanh thu.</li>
 *   <li>{@link #CANCELLED} — không thay đổi số dư, giải phóng các khoản doanh thu.</li>
 * </ul>
 */
public enum SettlementStatus {
    DRAFT,
    APPROVED,
    REJECTED,
    CANCELLED;

    /** Settlement chưa được duyệt — có thể từ chối / hủy. */
    public boolean isOpen() {
        return this == DRAFT;
    }

    /** Settlement đã được duyệt — lịch sử tài chính không được sửa. */
    public boolean isApproved() {
        return this == APPROVED;
    }
}
