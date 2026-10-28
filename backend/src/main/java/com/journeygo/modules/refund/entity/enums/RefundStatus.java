package com.journeygo.modules.refund.entity.enums;

/**
 * Trạng thái Refund Request.
 *
 * <p>Điểm cốt lõi (theo tài liệu): "Admin approved không đồng nghĩa Refund completed;
 * VNPAY accepted request cũng không đồng nghĩa tiền đã về tài khoản Tourist."
 */
public enum RefundStatus {
    /** Tourist đã gửi yêu cầu, chờ Admin xem xét. */
    PENDING_REVIEW,
    /** Admin đã duyệt, đang thực hiện hoàn tiền (qua VNPay hoặc chuyển khoản thủ công). */
    APPROVED,
    /** Đã gửi yêu cầu tới VNPay / đã chuyển khoản thủ công nhưng chưa có kết quả cuối cùng. */
    REFUND_PROCESSING,
    /** Hoàn tiền thành công — đã có bằng chứng xác minh. */
    REFUNDED,
    /** Admin từ chối yêu cầu. */
    REJECTED,
    /** Yêu cầu bị thất bại (đã xác minh rõ ràng). */
    FAILED,
    /** Tourist hủy yêu cầu trước khi Admin xử lý. */
    CANCELLED;

    /** Yêu cầu đang mở — chặn tạo yêu cầu Refund mới cho cùng Payment. */
    public boolean isOpen() {
        return this == PENDING_REVIEW || this == APPROVED || this == REFUND_PROCESSING;
    }

    /** Đã hoàn tiền thành công. */
    public boolean isRefunded() {
        return this == REFUNDED;
    }
}
