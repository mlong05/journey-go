package com.journeygo.modules.payment.entity.enums;

/**
 * Kết quả xử lý một giao dịch thanh toán.
 *
 * <p>Phân biệt trạng thái nghiệp vụ (Payment) với trạng thái giao dịch do VNPay phản hồi —
 * hai trạng thái này có thể khác nhau và phải được đối chiếu.
 */
public enum PaymentOutcome {
    /** Thanh toán thành công, đã xác minh — dùng để xác nhận Booking. */
    SUCCESS,
    /** Thanh toán thất bại đã được xác minh rõ ràng. */
    FAILED,
    /** Khách hủy giao dịch. */
    CANCELLED,
    /** Chưa xác định được kết quả — giữ nguyên trạng thái chờ, KHÔNG tự kết luận. */
    UNKNOWN,
    /** Giao dịch trùng (callback lặp) — đã được xử lý trước đó, không ghi nhận lại. */
    DUPLICATE
}
