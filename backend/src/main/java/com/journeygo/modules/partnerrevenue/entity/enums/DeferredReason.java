package com.journeygo.modules.partnerrevenue.entity.enums;

/**
 * Lý do một khoản doanh thu chưa đủ điều kiện tất toán.
 *
 * <p>Nếu có nhiều lý do cùng lúc, hệ thống lưu lý do hiện tại và đánh giá lại khi trạng thái
 * liên quan thay đổi.
 */
public enum DeferredReason {
    /** Payment chưa được xác minh thành công. */
    PAYMENT_NOT_VERIFIED,
    /** Booking chưa hoàn thành trải nghiệm. */
    BOOKING_NOT_COMPLETED,
    /** Refund đang chờ duyệt hoặc đang xử lý / chưa xác định kết quả. */
    REFUND_PENDING,
    /** Cần kiểm tra đối soát hoặc sai lệch tài chính. */
    FINANCIAL_REVIEW_REQUIRED
}
