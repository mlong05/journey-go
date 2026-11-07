package com.journeygo.modules.partnerapplication.entity.enums;

/**
 * Loại hình đối tác.
 *
 * <p>Quy tắc giấy tờ bắt buộc (đặc tả Final1_DOITAC.pdf — Giai đoạn 2):
 * <ul>
 *   <li>{@link #TRAVEL_AGENCY} — Công ty Lữ hành: bắt buộc có Giấy phép lữ hành
 *       (Quốc tế hoặc Nội địa) + Giấy ký quỹ + Giấy phép hoạt động.</li>
 *   <li>{@link #EXPERIENCE_PROVIDER} — Đơn vị cung cấp Trải nghiệm / Điểm đến:
 *       chỉ yêu cầu Giấy phép hoạt động + Giấy đăng ký kinh doanh thông thường.</li>
 * </ul>
 */
public enum PartnerType {
    /** Công ty Lữ hành — cần Giấy phép lữ hành (quốc tế / nội địa) + Giấy ký quỹ. */
    TRAVEL_AGENCY,
    /** Đơn vị cung cấp Trải nghiệm / Điểm đến — cần GPKD / Hộ kinh doanh. */
    EXPERIENCE_PROVIDER;

    public boolean requiresTravelLicense() {
        return this == TRAVEL_AGENCY;
    }
}
