package com.journeygo.modules.wallet.entity.enums;

/**
 * Loại giao dịch Wallet.
 */
public enum WalletTransactionType {
    /** Cộng tiền từ Settlement được duyệt. */
    SETTLEMENT_CREDIT,
    /** Điều chỉnh doanh thu Partner do Refund hoặc sai lệch tài chính phát sinh sau tất toán. */
    REFUND_ADJUSTMENT,
    /** Điều chỉnh thủ công do Admin có thẩm quyền phê duyệt. */
    MANUAL_ADJUSTMENT
}
