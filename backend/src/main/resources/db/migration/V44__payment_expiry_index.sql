-- ═══════════════════════════════════════════════════════════════════════════════
-- V44 — Index cho tác vụ quét Payment quá hạn thanh toán
--
-- Bối cảnh:
--   Tác vụ nền `PaymentExpiryScheduler` quét mỗi 60 giây các giao dịch thanh toán
--   đã quá hạn (expires_at < now) mà chưa có kết quả xác minh từ VNPay
--   (status IN ('PENDING','PROCESSING')) để chuyển sang EXPIRED.
--
--   Trước đây KHÔNG có tác vụ nào đóng các giao dịch này:
--     • BookingExpiryScheduler chỉ chuyển BOOKING sang EXPIRED + giải phóng slot.
--     • PaymentReconciliationScheduler gọi QueryDR — nhưng QueryDR trên VNPay
--       Sandbox LUÔN trả vnp_ResponseCode=99 ⇒ không bao giờ đóng được ⇒ giao dịch
--       treo vô thời hạn ở PROCESSING (hiển thị "Đang xử lý" hàng tháng trên
--       trang Quản trị Tài chính dù hạn thanh toán đã qua từ lâu).
--
-- Thay đổi:
--   1. Index (status, expires_at) — phục vụ truy vấn quét giao dịch quá hạn.
--   2. Backfill: đóng các giao dịch quá hạn còn treo PENDING/PROCESSING.
--      ⚠️ Áp dụng cùng "khoảng lướt an toàn" 15 phút như runtime
--         (app.finance.payment-expiry-grace-seconds, mặc định 900).
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Index phục vụ truy vấn quét giao dịch quá hạn ────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                   WHERE schemaname = current_schema() AND indexname = 'idx_payments_status_expires_at') THEN
        CREATE INDEX idx_payments_status_expires_at
            ON payments (status, expires_at);
    END IF;
END $$;

-- ── 2. Backfill: đóng giao dịch quá hạn còn treo ────────────────────────────
-- ⚠️ CHỈ đóng giao dịch đã quá hạn + khoảng lướt an toàn 15 phút:
--    trong khoảng đó tác vụ đối soá (QueryDR) còn có cơ hội xác minh giao dịch
--    mà khách ĐÃ thanh toán thành công nhưng callback/IPN bị mất.
--
-- ⚠️ KHÔNG đụng vào giao dịch đã có kết quả (SUCCESS/FAILED/CANCELLED/SUPERSEDED).
-- ⚠️ `resolved_at` được đặt để đánh dấu đã đóng, khớp với runtime.
UPDATE payments
SET status      = 'EXPIRED',
    resolved_at = NOW(),
    note        = 'Giao dịch đã quá hạn thanh toán và không có kết quả xác minh từ VNPay.'
WHERE status IN ('PENDING', 'PROCESSING')
  AND expires_at IS NOT NULL
  AND expires_at < NOW()
      - INTERVAL '15 minutes';
