-- ── V32: Giao dịch thanh toán bị BỎ RƠI khi khách thanh toán nhiều lần ────────
--
-- Bối cảnh
-- ────────
-- Kịch bản lỗi:
--   1. Khách bấm "Thanh toán" → giao dịch #1 (PENDING) → mở trình duyệt VNPay.
--   2. Khách QUAY LẠI app (không hoàn tất) → bấm "Thanh toán" lần nữa
--      → giao dịch #2 (txnRef khác) → thanh toán THÀNH CÔNG → Booking = CONFIRMED.
--   3. Giao dịch #1 không có callback/IPN nào tới ⇒ treo ở PENDING vô thời hạn.
--   4. Bấm "Kiểm tra lại" trên giao dịch #1 → QueryDR trên Sandbox trả
--      `vnp_ResponseCode=99` ⇒ UI hiện "Đang chờ kết quả thanh toán" MÃI MÃI,
--      dù đơn hàng vốn đã được thanh toán.
--
-- ⇒ Thêm trạng thái `SUPERSEDED` (giao dịch bị thay thế) để đóng DỨT KHOÁT
--   các giao dịch treo này — không phải "chưa rõ" nữa.
--
-- ⚠️ An toàn về tiền:
--   Nếu khách thực tế ĐÃ thanh toán ở cửa sổ trình duyệt cũ ⇒ callback vẫn
--   tới được xử lý ⇒ `confirmBookingAfterVerifiedPayment` đánh dấu DUPLICATE
--   (khoản tiền dư) ⇒ KHÔNG xác nhận Booking 2 lần ⇒ không mất tiền khách.

-- 1) Gỡ CHECK constraint của cột status nếu Hibernate đã sinh (VD
--    `payments_status_check`) — trạng thái mới `SUPERSEDED` phải được phép.
ALTER TABLE payments DROP CONSTRAINT IF EXISTS payments_status_check;

-- 2) Đóng các giao dịch đang KẸT (PENDING / PROCESSING) của những booking đã
--    được thanh toán bởi MỘT giao dịch khác ⇒ `SUPERSEDED`.
--
--    Điều kiện: booking có ít nhất 1 giao dịch SUCCESS khác (giao dịch đã thực
--    sự thu tiền và xác nhận booking) ⇒ giao dịch đang kẹt của cùng booking
--    chắc chắn là "bị bỏ rơi".
UPDATE payments p
   SET status       = 'SUPERSEDED',
       resolved_at  = NOW(),
       updated_at   = NOW(),
       note         = COALESCE(
                        NULLIF(p.note, ''),
                        'Giao dịch đã bị thay thế: đơn hàng đã được thanh toán thành công '
                        || 'bởi một giao dịch khác.'
                      )
 WHERE p.status IN ('PENDING', 'PROCESSING')
   AND EXISTS (
        SELECT 1
          FROM bookings b
         WHERE b.id = p.booking_id
           AND b.status IN ('CONFIRMED', 'COMPLETED')
       )
   AND EXISTS (
        SELECT 1
          FROM payments ok
         WHERE ok.booking_id = p.booking_id
           AND ok.id <> p.id
           AND ok.status = 'SUCCESS'
       );

-- 3) Giao dịch treo của booking đã HẾT HẠN (EXPIRED / CANCELLED) mà chưa có
--    kết quả ⇒ cũng đóng lại (SUPERSEDED) thay vì để treo ở PENDING.
--    ⚠️ Booking CANCELLED có thể do khách hủy ⇒ giao dịch cũng không còn ý nghĩa.
UPDATE payments p
   SET status      = 'SUPERSEDED',
       resolved_at = NOW(),
       updated_at  = NOW(),
       note        = COALESCE(
                       NULLIF(p.note, ''),
                       'Giao dịch đã bị thay thế: đơn hàng không còn ở trạng thái chờ thanh toán.'
                     )
 WHERE p.status IN ('PENDING', 'PROCESSING')
   AND EXISTS (
        SELECT 1
          FROM bookings b
         WHERE b.id = p.booking_id
           AND b.status IN ('EXPIRED', 'CANCELLED')
       );
