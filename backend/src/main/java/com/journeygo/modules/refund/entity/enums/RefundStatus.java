package com.journeygo.modules.refund.entity.enums;

/**
 * Trạng thái Refund Request.
 *
 * <p>Điểm cốt lõi (theo tài liệu): "Admin approved không đồng nghĩa Refund completed;
 * VNPAY accepted request cũng không đồng nghĩa tiền đã về tài khoản Tourist."
 *
 * <p><b>⚠️ Nguyên tắc "một thời điểm — một trạng thái — một phương thức":</b>
 * mỗi yêu cầu hoàn tiền chỉ có MỘT phương thức hoàn tại mỗi thời điểm, nên trạng
 * thái "đang xử lý" phải TÁCH theo phương thức:
 * <ul>
 *   <li>{@link #VNPAY_PROCESSING} — đã gửi yêu cầu tới VNPay, đang chờ VNPay xác nhận
 *       kết quả hoàn tiền (trên Sandbox, đây là trạng thái cuối của kịch bản test).</li>
 *   <li>{@link #MANUAL_TRANSFER_PENDING} — đã chốt phương thức chuyển khoản thủ công,
 *       đang chờ quản trị viên thực hiện chuyển khoản rồi ghi nhận bằng chứng.</li>
 * </ul>
 * Nếu dùng chung một trạng thái "đang xử lý" cho cả hai, giao diện sẽ hiển thị
 * "Đang xử lý hoàn tiền" cạnh nút "Chuyển thủ công" / "Đã chuyển" ⇒ người dùng
 * không xác định được yêu cầu đang chờ gì.
 */
public enum RefundStatus {
    /** Tourist đã gửu yêu cầu, chờ Admin xem xét. */
    PENDING_REVIEW,
    /** Admin đã duyệt, đang thực hiện hoàn tiền (qua VNPay hoặc chuyển khoản thủ công). */
    APPROVED,
    /**
     * Đã gửi yêu cầu hoàn tiền tới VNPay — đang chờ VNPay xác nhận kết quả cuối cùng.
     *
     * <p>Phương thức hoàn tại thời điểm này là {@code VNPAY_API}. Không được hiển thị
     * hay cho phép thao tác chuyển khoản thủ công — tránh hoàn tiền hai lần.
     */
    VNPAY_PROCESSING,
    /**
     * Đã chốt phương thức chuyển khoản ngân hàng thủ công — đang chờ quản trị viên
     * thực hiện chuyển khoản rồi ghi nhận mã tham chiếu + bằng chứng.
     */
    MANUAL_TRANSFER_PENDING,
    /** Hoàn tiền thành công — đã có bằng chứng xác minh. */
    REFUNDED,
    /** Admin từ chối yêu cầu. */
    REJECTED,
    /** Yêu cầu bị thất bại (đã xác minh rõ ràng). */
    FAILED,
    /** Tourist hủy yêu cầu trước khi Admin xử lý. */
    CANCELLED,
    /**
     * @deprecated Trạng thái lịch sử — trước đây dùng chung cho cả VNPay và chuyển khoản
     * thủ công. Đã tách thành {@link #VNPAY_PROCESSING} / {@link #MANUAL_TRANSFER_PENDING}.
     * Giữ lại enum value để các dòng nhật ký kiểm toán cũ (append-only) vẫn đọc được
     * mà không gây lỗi deserialization.
     */
    @Deprecated
    REFUND_PROCESSING;

    /** Yêu cầu đang mở — chặn tạo yêu cầu Refund mới cho cùng Payment. */
    public boolean isOpen() {
        return this == PENDING_REVIEW
                || this == APPROVED
                || this == VNPAY_PROCESSING
                || this == MANUAL_TRANSFER_PENDING
                || this == REFUND_PROCESSING
                || this == REFUNDED;
    }

    /** Đã hoàn tiền thành công. */
    public boolean isRefunded() {
        return this == REFUNDED;
    }

    /** Trạng thái "đang chờ kết quả" — chưa có kết luận cuối cùng. */
    public boolean isPendingResult() {
        return this == VNPAY_PROCESSING
                || this == MANUAL_TRANSFER_PENDING
                || this == REFUND_PROCESSING;
    }
}
