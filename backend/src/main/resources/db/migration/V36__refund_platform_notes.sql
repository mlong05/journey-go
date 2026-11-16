-- =====================================================================================
--  V36 -- Bổ sung ghi chú của nền tảng cho đơn hoàn tiền
--
--  Mục đích:
--    • `transfer_note`  — ghi chú của nền tảng khi Admin ghi nhận chuyển khoản thủ công
--                        (tách khỏi `transfer_evidence` là ảnh bằng chứng).
--    • `admin_note`     — ghi chú của nền tảng khi Admin xử lý yêu cầu (duyệt / từ chối).
--
--  Vì sao cần:
--    Người dùng cần thấy đầy đủ quá trình xử lý: lý do họ gửi, lý do nền tảng
--    xác định, và ghi chú giải thích của nền tảng (VD: "Đã chuyển kèm phí 11.000đ").
--    Trước đó chỉ có `transfer_evidence` (dùng chung cho ảnh + mô tả) và
--    `rejectionReason` (chỉ dùng khi từ chối) ⇒ mất thông tin khi duyệt.
--
--  AN TOAN & IDEMPOTENT:
--    `ADD COLUMN IF NOT EXISTS` ⇒ chạy lại nhiều lần vẫn an toàn.
-- =====================================================================================

--  Thêm cột mới: liên kết tin nhắn / cuộc trò chuyện với đơn đặt tour
ALTER TABLE refund_requests ADD COLUMN IF NOT EXISTS transfer_note TEXT;
ALTER TABLE refund_requests ADD COLUMN IF NOT EXISTS admin_note    TEXT;

-- =====================================================================================
--  Het V36.
-- =====================================================================================
