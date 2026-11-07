package com.journeygo.modules.moderation.entity.enums;

public enum TourReviewStatus {
    /** Chỉ còn ở dữ liệu cũ (sau khi khôi phục tour bị xóa). */
    DRAFT,
    PENDING,
    APPROVED,
    CHANGES_REQUESTED,
    REJECTED
}
