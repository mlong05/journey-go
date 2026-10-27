package com.journeygo.modules.moderation.entity.enums;

public enum DestinationRejectionReason {
    INACCURATE_INFORMATION("Thông tin điểm đến chưa chính xác"),
    INCOMPLETE_INFORMATION("Thông tin điểm đến chưa đầy đủ"),
    INAPPROPRIATE_DESTINATION("Điểm đến không phù hợp với nền tảng"),
    DUPLICATE_DESTINATION("Điểm đến bị trùng lặp"),
    OTHER("Lý do khác");

    private final String label;
    DestinationRejectionReason(String label) { this.label = label; }
    public String getCode() { return name(); }
    public String getLabel() { return label; }
}
