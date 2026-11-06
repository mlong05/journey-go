package com.journeygo.modules.providerrevenue.entity.enums;

/**
 * Trạng thái đủ tư cách tất toán của một khoản doanh thu ProviderProfile.
 *
 * <p>Phân biệt rõ với {@code PaymentStatus}: Payment SUCCESS không có nghĩa doanh thu
 * đã đủ tư cách tất toán.
 */
public enum ProviderRevenueStatus {
    /** Chưa đủ điều kiện tất toán. */
    PENDING,
    /** Đủ điều kiện, chưa được đưa vào Settlement. */
    ELIGIBLE,
    /** Đã được chọn vào một Settlement đang chờ xử lý. */
    IN_SETTLEMENT,
    /** Đã thuộc Settlement được duyệt và ghi nhận vào Wallet. */
    SETTLED;

    /** Có thể chuyển sang {@code IN_SETTLEMENT} từ trạng thái hiện tại. */
    public boolean canBeSelectedIntoSettlement() {
        return this == ELIGIBLE;
    }
}
