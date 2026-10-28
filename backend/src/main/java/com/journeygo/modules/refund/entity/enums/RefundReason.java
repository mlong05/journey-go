package com.journeygo.modules.refund.entity.enums;

/**
 * Nguyên nhân Refund — quyết định tỷ lệ hoàn tiền.
 *
 * <ul>
 *   <li>{@link #TOURIST_FAULT} — lỗi từ Tourist / lý do cá nhân → hoàn 50%.</li>
 *   <li>{@link #PLATFORM_FAULT} — lỗi từ nền tảng → hoàn 100%.</li>
 * </ul>
 */
public enum RefundReason {
    TOURIST_FAULT,
    PLATFORM_FAULT;

    /** Tỷ lệ hoàn tiền theo chính sách hiện hành. */
    public java.math.BigDecimal refundRate() {
        return switch (this) {
            case TOURIST_FAULT -> new java.math.BigDecimal("0.50");
            case PLATFORM_FAULT -> java.math.BigDecimal.ONE;
        };
    }
}
