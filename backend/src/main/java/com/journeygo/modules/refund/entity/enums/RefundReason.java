package com.journeygo.modules.refund.entity.enums;

/**
 * Nhóm lý do hoàn tiền — quyết định tỷ lệ hoàn theo chính sách.
 *
 * <p>Bốn nhóm lý do theo chính sách hoàn tiền của JourneyGo:
 * <ul>
 *   <li>{@link #PERSONAL} — Lỗi khách hàng (lý do cá nhân) → hoàn 50%.</li>
 *   <li>{@link #PLATFORM_FAULT} — Lỗi nền tảng (JourneyGo) → hoàn 100%.</li>
 *   <li>{@link #PROVIDER_FAULT} — Lỗi đối tác (Content Provider) → hoàn 100%.</li>
 *   <li>{@link #FORCE_MAJEURE} — Lỗi bất khả kháng → hoàn 0%.</li>
 * </ul>
 *
 * <p><b>Lưu ý:</b> mã nhóm KHÔNG bị hardcode trong nghiệp vụ — Admin quản lý
 * tên hiển thị, tỷ lệ hoàn và danh sách mã lý do chi tiết trong tab
 * "Cấu hình lý do hoàn tiền". Giá trị {@link #defaultRefundRate()} ở đây chỉ là
 * giá trị mặc định khi DB chưa có cấu hình (fallback an toàn).
 *
 * <p>Web hiển thị tên tiếng Việt lấy từ bảng cấu hình, không hiển thị mã nhóm.
 */
public enum RefundReason {

    /** Lỗi khách hàng — lý do cá nhân. */
    PERSONAL,

    /** Lỗi nền tảng (JourneyGo). */
    PLATFORM_FAULT,

    /** Lỗi đối tác (Content Provider). */
    PROVIDER_FAULT,

    /** Lỗi bất khả kháng (thiên tai, dịch bệnh, quyết định hạn chế của cơ quan nhà nước). */
    FORCE_MAJEURE;

    /**
     * Tỷ lệ hoàn mặc định của nhóm — chỉ dùng làm fallback khi DB chưa có cấu hình.
     *
     * <p>Nguồn sự thật là bảng {@code refund_reason_groups} do Admin quản lý.
     */
    public java.math.BigDecimal defaultRefundRate() {
        return switch (this) {
            case PERSONAL -> new java.math.BigDecimal("0.50");
            case PLATFORM_FAULT, PROVIDER_FAULT -> java.math.BigDecimal.ONE;
            case FORCE_MAJEURE -> java.math.BigDecimal.ZERO;
        };
    }

    /** Nhóm bất khả kháng — theo chính sách không hoàn tiền. */
    public boolean isForceMajeure() {
        return this == FORCE_MAJEURE;
    }
}
