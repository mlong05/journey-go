package com.journeygo.modules.moderation.entity.enums;

public enum ContentRejectionReason {
    IMAGE_NOT_RELEVANT("Ảnh không phù hợp với nội dung"),
    INACCURATE_INFORMATION("Thông tin chưa chính xác"),
    INAPPROPRIATE_CONTENT("Nội dung không phù hợp"),
    COPYRIGHT_VIOLATION("Vi phạm bản quyền"),
    INCOMPLETE_CONTENT("Nội dung chưa đầy đủ"),
    DUPLICATE_CONTENT("Nội dung bị trùng lặp"),
    OTHER("Lý do khác");

    private final String label;
    ContentRejectionReason(String label) { this.label = label; }
    public String getCode() { return name(); }
    public String getLabel() { return label; }
}
