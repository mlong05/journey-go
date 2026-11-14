package com.journeygo.modules.notification.entity.enums;

/**
 * Loại thông báo. {@link Category} quyết định biểu tượng / màu ở web và app,
 * nên khi thêm loại mới chỉ cần chọn đúng nhóm.
 */
public enum NotificationType {

    // ── Moderator: hàng chờ kiểm duyệt ───────────────────────────────────────
    DESTINATION_PENDING(Category.REVIEW),
    TOUR_PENDING(Category.REVIEW),
    CONTENT_PENDING(Category.REVIEW),
    EXPERIENCE_PENDING(Category.REVIEW),
    POST_PENDING(Category.COMMUNITY),
    POST_REPORTED(Category.COMMUNITY),

    // ── Admin ────────────────────────────────────────────────────────────────
    REFUND_REQUESTED(Category.REFUND),
    ADJUSTMENT_PENDING(Category.FINANCE),
    PARTNER_APPLICATION_PENDING(Category.REVIEW),
    PARTNER_PROFILE_UPDATE_PENDING(Category.REVIEW),

    // ── Provider ─────────────────────────────────────────────────────────────
    DESTINATION_APPROVED(Category.APPROVED),
    DESTINATION_REJECTED(Category.REJECTED),
    TOUR_APPROVED(Category.APPROVED),
    TOUR_REJECTED(Category.REJECTED),
    CONTENT_APPROVED(Category.APPROVED),
    CONTENT_REJECTED(Category.REJECTED),
    EXPERIENCE_APPROVED(Category.APPROVED),
    EXPERIENCE_REJECTED(Category.REJECTED),
    BOOKING_RECEIVED(Category.BOOKING),
    SETTLEMENT_APPROVED(Category.FINANCE),
    SETTLEMENT_REJECTED(Category.REJECTED),
    PARTNER_APPLICATION_APPROVED(Category.APPROVED),
    PARTNER_APPLICATION_REJECTED(Category.REJECTED),
    PARTNER_PROFILE_UPDATE_APPROVED(Category.APPROVED),
    PARTNER_PROFILE_UPDATE_REJECTED(Category.REJECTED),

    // ── Du khách ─────────────────────────────────────────────────────────────
    PAYMENT_SUCCESS(Category.BOOKING),
    TOUR_REMINDER(Category.BOOKING),
    PASSENGER_CHANGE_REQUESTED(Category.BOOKING),
    PASSENGER_CHANGE_APPROVED(Category.BOOKING),
    PASSENGER_CHANGE_REJECTED(Category.BOOKING),
    TOUR_INVITATION_SENT(Category.BOOKING),
    REFUND_APPROVED(Category.REFUND),
    REFUND_REJECTED(Category.REJECTED),
    REFUND_COMPLETED(Category.REFUND),
    BADGE_AWARDED(Category.REWARD),
    POST_APPROVED(Category.APPROVED),
    POST_REJECTED(Category.REJECTED),
    POST_NEEDS_REVISION(Category.COMMUNITY),
    POST_COMMENTED(Category.COMMUNITY),
    POST_HIDDEN(Category.REJECTED),
    POST_RESTORED(Category.APPROVED),
    REPORT_RESOLVED(Category.COMMUNITY),
    REPORT_DISMISSED(Category.COMMUNITY),

    // ── Chat (du khách ↔ đối tác) ───────────────────────────────────────────
    /** Tin nhắn mới trong khung chat hỗ trợ của Booking. */
    BOOKING_MESSAGE_RECEIVED(Category.CHAT),
    /** Tin nhắn mới trong khung chat với nhà tour (trước khi đặt tour). */
    PROVIDER_MESSAGE_RECEIVED(Category.CHAT);

    /** Nhóm hiển thị: web/app dùng để chọn biểu tượng và màu nhấn. */
    public enum Category { REVIEW, COMMUNITY, REFUND, FINANCE, APPROVED, REJECTED, BOOKING, REWARD, CHAT }

    private final Category category;

    NotificationType(Category category) {
        this.category = category;
    }

    public Category getCategory() {
        return category;
    }
}
