package com.journeygo.modules.partnerapplication.entity.enums;

/**
 * Phạm vi hoạt động của Công ty Lữ hành.
 *
 * <p>Chỉ áp dụng khi {@link PartnerType#TRAVEL_AGENCY}; các loại hình khác bỏ trống.
 */
public enum TravelScope {
    /** Giấy phép lữ hành Quốc tế. */
    INTERNATIONAL,
    /** Giấy phép lữ hành Nội địa. */
    DOMESTIC
}
