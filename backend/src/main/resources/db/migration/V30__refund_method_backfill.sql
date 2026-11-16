-- =====================================================================================
--  V30 — Backfill cột `method` cho các yêu cầu hoàn tiền đã bị kẹt.
--
--  ── Vì sao có migration này? ──
--  Trước đây `RefundService.reviewRefund` KHÔNG gọi `refund.setMethod(...)`
--  ⇒ cột `refund_requests.method` bị NULL cho MỌI yêu cầu được duyệt bằng
--  phương thức VNPay.
--
--  Hậu quả:
--    • Tác vụ nền `RefundStatusScheduler` lọc bằng
--      `findByStatusAndMethod(REFUND_PROCESSING, VNPAY_API)`
--      ⇒ các yêu cầu có `method = NULL` KHÔNG BAO GIỜ được quét lại
--      ⇒ yêu cầu kẹt vĩnh viễn ở trạng thái "Đang xử lý hoàn tiền".
--    • Cột "Phương thức hoàn" trên trang Admin hiển thị "Chưa chọn".
--
--  ── Cách sửa ──
--  Backfill `method = 'VNPAY_API'` cho các yêu cầu đang ở trạng thái
--  APPROVED / REFUND_PROCESSING mà `method` còn NULL — đúng những yêu cầu đã
--  được duyệt qua VNPay nhưng bị quên lưu phương thức.
--
--  ⚠️ KHÔNG đụng vào các yêu cầu đã REFUNDED/REJECTED (đã đóng, có method
--  đúng rồi) và KHÔNG gán cho yêu cầu PENDING_REVIEW (chưa duyệt ⇒ Admin
--  sẽ chọn phương thức khi duyệt).
-- =====================================================================================

UPDATE refund_requests
   SET method = 'VNPAY_API'
 WHERE method IS NULL
   AND status IN ('APPROVED', 'REFUND_PROCESSING');
