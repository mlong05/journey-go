package com.journeygo.modules.moderation.entity.enums;

/** Bước của luồng tạo tour mà ghi chú kiểm duyệt gắn vào. */
public enum TourReviewStep {
    BASIC_INFO("Thông tin cơ bản"),
    PRICING("Giá vé"),
    STOPS("Điểm đến"),
    SCHEDULE("Lịch khởi hành");

    private final String label;

    TourReviewStep(String label) {
        this.label = label;
    }

    /** Tên bước tiếng Việt (dùng trong lịch sử kiểm duyệt / email). */
    public String getLabel() {
        return label;
    }
}
