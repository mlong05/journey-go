package com.journeygo.modules.wallet.entity.enums;

/**
 * Trạng thái giao dịch Wallet.
 *
 * <p>Quy tắc: "Không cho phép tạo giao dịch cộng tiền lần thứ hai cho cùng một Settlement."
 */
public enum WalletTransactionStatus {
    /** Giao dịch đã ghi nhận thành công vào số dư. */
    SUCCESS,
    /** Giao dịch thất bại — không ảnh hưởng số dư. */
    FAILED,
    /** Giao dịch đang chờ xử lý (chưa áp dụng vào số dư). */
    PENDING
}
