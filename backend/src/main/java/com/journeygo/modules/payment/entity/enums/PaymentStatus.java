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
    CANCELLED,
    /**
     * Giao dịch bị THAY THẾ — khách đã tạo giao dịch mới (lần thứ 2) và Booking
     * đã được thanh toán bởi giao dịch mới đó.
     *
     * <p>── Vì sao cần trạng thái này? ──
     * Kịch bản lỗi: khách mở trình duyệt VNPay (giao dịch #1 tạo, trạng thái
     * {@code PENDING}), quay lại app và bấm "Thanh toán" lần nữa (giao dịch #2),
     * lần này thanh toán THÀNH CÔNG ⇒ Booking chuyển {@code CONFIRMED}.
     *
     * <p>Giao dịch #1 khi đó bị BỎ RƠI: không có callback/IPN nào tới (khách đã
     * quay lại app và không hoàn tất ở trang VNPay) ⇒ nó treo ở {@code PENDING}
     * vô thời hạn. Khi khách bấm "Kiểm tra lại", hệ thống hỏi VNPay (QueryDR)
     * nhưng trên Sandbox QueryDR luôn trả {@code 99} ⇒ màn hình hiện
     * "Đang chờ kết quả thanh toán" mãi mãi, dù đơn vốn đã được thanh toán.
     *
     * <p>⇒ Trạng thái này cho phép backend đóng giao dịch bị bỏ rơi một cách
     * DỨT KHOÁT (không phải "chưa rõ") khi biết chắc Booking đã được thanh toán
     * bởi giao dịch khác ⇒ UI hiển thị rõ "giao dịch này đã bị thay thế".
     *
     * <p>⚠️ KHÔNG đánh dấu giao dịch này là thất bại/thành công — tiền thực tế
     * có thể vẫn còn "trôi" ở VNPay nếu khách đã thanh toán ở cửa sổ trình duyệt
     * cũ ⇒ khoản tiền dư được xử lý qua quy trình hoàn tiền/đối soát.
     */
    SUPERSEDED;

    /** Giao dịch đã có kết quả cuối cùng rõ ràng. */
    public boolean isFinal() {
        return this == SUCCESS || this == FAILED || this == CANCELLED || this == SUPERSEDED;
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
