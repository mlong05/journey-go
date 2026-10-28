package com.journeygo.modules.payment.entity.enums;

/**
 * Trạng thái Payment (lần thử thanh toán).
 *
 * <p>Phân biệt rõ "chưa rõ kết quả" với "thất bại" — đây là điểm mấu chốt của tài liệu:
 * <ul>
 *   <li>{@code PENDING} — đã khởi tạo, chờ khách thanh toán / chờ callback.</li>
 *   <li>{@code PROCESSING} — đã gửi yêu cầu tới VNPay, chưa có kết quả cuối cùng.
 *       Không được coi là thất bại (UC-03, UC-05).</li>
 *   <li>{@code SUCCESS} — đã được xác minh thành công từ nguồn đáng tin cậy (IPN hoặc QueryDR).</li>
 *   <li>{@code FAILED} — đã xác minh là thất bại (vnp_TransactionStatus = 02 / vnp_ResponseCode != 00).</li>
 *   <li>{@code EXPIRED} — quá thời hạn thanh toán mà chưa có kết quả xác minh.</li>
 *   <li>{@code CANCELLED} — khách hủy giao dịch trên trang VNPay.</li>
 * </ul>
 */
public enum PaymentStatus {
    PENDING,
    PROCESSING,
    SUCCESS,
    FAILED,
    EXPIRED,
    CANCELLED;

    /** Giao dịch đã có kết quả cuối cùng rõ ràng. */
    public boolean isFinal() {
        return this == SUCCESS || this == FAILED || this == CANCELLED;
    }

    /** Giao dịch thành công đã được xác minh. */
    public boolean isSuccessful() {
        return this == SUCCESS;
    }

    /** Giao dịch thất bại đã được xác minh rõ ràng — cho phép tạo lần thử mới. */
    public boolean isVerifiedFailure() {
        return this == FAILED || this == CANCELLED;
    }
}
