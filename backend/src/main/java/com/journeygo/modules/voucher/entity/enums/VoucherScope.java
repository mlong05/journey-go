package com.journeygo.modules.voucher.entity.enums;

/**
 * Phạm vi áp dụng của voucher:
 * - PLATFORM: Voucher toàn sàn do Admin tạo, trừ vào doanh thu hoa hồng của nền tảng.
 * - PARTNER: Voucher riêng của đối tác cụ thể, trừ vào doanh thu của đối tác đó.
 */
public enum VoucherScope {
    PLATFORM,
    PARTNER
}
