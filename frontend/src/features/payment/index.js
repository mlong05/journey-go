/**
 * Feature "Payment" cho WEB.
 *
 * ── Phạm vi ──
 * Thanh toán diễn ra TRÊN MOBILE (du khách đặt tour và thanh toán bằng app).
 * Web chỉ dùng API thanh toán ở góc nhìn QUẢN TRỊ (admin tài chính, tất toán):
 * xem giao dịch, tra cứu, tổng hợp doanh thu.
 *
 * ⇒ Không có màn checkout / trang kết quả thanh toán trên web.
 */
export { default as paymentService } from "./services/paymentService";
