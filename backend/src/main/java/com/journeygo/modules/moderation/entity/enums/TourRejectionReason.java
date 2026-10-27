package com.journeygo.modules.moderation.entity.enums;

public enum TourRejectionReason {
    INACCURATE_INFORMATION("Thông tin tour chưa chính xác"),
    INCOMPLETE_INFORMATION("Thông tin tour chưa đầy đủ"),
    INAPPROPRIATE_TOUR("Tour không phù hợp với nền tảng"),
    INVALID_PRICE_OR_DATES("Giá hoặc ngày khởi hành không hợp lệ"),
    INVALID_ITINERARY("Lịch trình hoặc điểm đến chưa hợp lệ"),
    DUPLICATE_TOUR("Tour bị trùng lặp"),
    OTHER("Lý do khác");

    private final String label;
    TourRejectionReason(String label) { this.label = label; }
    public String getCode() { return name(); }
    public String getLabel() { return label; }
}
