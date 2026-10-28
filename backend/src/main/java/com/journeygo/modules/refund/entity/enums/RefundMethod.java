package com.journeygo.modules.refund.entity.enums;

/**
 * Phương thức hoàn tiền.
 *
 * <ul>
 *   <li>{@link #VNPAY_API} — phương thức chính: gửi yêu cầu hoàn tới VNPay qua Refund API.</li>
 *   <li>{@link #MANUAL_BANK_TRANSFER} — phương thức dự phòng khi VNPay không khả dụng hoặc
 *       giao dịch không thể hoàn tiếp qua VNPay sau khi đã xác minh.</li>
 * </ul>
 */
public enum RefundMethod {
    VNPAY_API,
    MANUAL_BANK_TRANSFER
}
