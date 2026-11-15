-- =====================================================================================
--  V31 — Tách trạng thái "đang xử lý hoàn tiền" theo phương thức hoàn.
--
--  ── Vì sao? ──
--  Trước đây `REFUND_PROCESSING` dùng CHUNG cho cả hai phương thức:
--    • Hoàn tiền qua VNPay (đã gửi yêu cầu, đang chờ VNPay xác nhận)
--    • Chuyển khoản ngân hàng thủ công (đã chốt phương thức, chờ admin chuyển tiền)
--
--  ⇒ Giao diện hiển thị "Đang xử lý hoàn tiền" cạnh nút "Chuyển thủ công" /
--     "Đã chuyển" ⇒ người dùng không xác định được yêu cầu đang chờ gì.
--
--  ── Cách sửa ──
--  Tách thành 2 trạng thái rời nhau:
--    • VNPAY_PROCESSING         — đang chờ VNPay xác nhận kết quả hoàn tiền
--    • MANUAL_TRANSFER_PENDING  — đang chờ admin thực hiện chuyển khoản thủ công
--
--  ⚠️ Mỗi yêu cầu chỉ có MỘT phương thức hoàn tại mỗi thời điểm ⇒ việc chuyển
--     trạng thái dựa trên cột `method` là chính xác, không cần suy đoán.
--
--  ── AN TOÀN ──
--  • Idempotent — chạy lại nhiều lần cho kết quả giống nhau.
--  • Chỉ đụng tới dòng `REFUND_PROCESSING`; các trạng thái khác giữ nguyên.
--  • Enum `REFUND_PROCESSING` được giữ lại ở Java (đánh dấu @Deprecated) để các
--    dòng nhật ký kiểm toán cũ (bảng append-only) vẫn đọc được.
-- =====================================================================================

-- 1) Yêu cầu đang chờ VNPay xác nhận.
UPDATE refund_requests
   SET status = 'VNPAY_PROCESSING'
 WHERE status = 'REFUND_PROCESSING'
   AND method = 'VNPAY_API';

-- 2) Yêu cầu đang chờ admin thực hiện chuyển khoản thủ công.
UPDATE refund_requests
   SET status = 'MANUAL_TRANSFER_PENDING'
 WHERE status = 'REFUND_PROCESSING'
   AND method = 'MANUAL_BANK_TRANSFER';

-- 3) Dữ liệu cũ chưa ghi phương thức (NULL) — mặc định coi là VNPay vì đó là
--    phương thức mặc định của hệ thống khi duyệt.
UPDATE refund_requests
   SET status = 'VNPAY_PROCESSING'
 WHERE status = 'REFUND_PROCESSING'
   AND (method IS NULL OR method NOT IN ('VNPAY_API', 'MANUAL_BANK_TRANSFER'));

-- 4) Chuẩn hoá nhật ký kiểm toán cũ (append-only ⇒ chỉ cập nhật tại chỗ, không xoá).
--    Giữ nguyên lịch sử; chỉ dịch mã trạng thái cho khớp trạng thái mới.
UPDATE refund_audit_logs
   SET from_status = 'VNPAY_PROCESSING'
 WHERE from_status = 'REFUND_PROCESSING'
   AND action IN ('VNPAY_REQUEST_SENT', 'VNPAY_RESPONSE', 'VNPAY_STATUS_UPDATED');

UPDATE refund_audit_logs
   SET to_status = 'VNPAY_PROCESSING'
 WHERE to_status = 'REFUND_PROCESSING'
   AND action IN ('VNPAY_REQUEST_SENT', 'VNPAY_RESPONSE', 'VNPAY_STATUS_UPDATED');

UPDATE refund_audit_logs
   SET from_status = 'MANUAL_TRANSFER_PENDING',
       to_status   = 'MANUAL_TRANSFER_PENDING'
 WHERE action = 'MANUAL_TRANSFER_RECORDED'
   AND (from_status = 'REFUND_PROCESSING' OR to_status = 'REFUND_PROCESSING');

-- 4b) "Đã ghi nhận chuyển khoản thủ công" — cả `from_status` lẫn `to_status` đều là
--     trạng thái chờ chuyển khoản thủ công.
--     ⚠️ Phải gán `to_status` TRƯỚC khi gán `from_status` (vì điều kiện lọc cả hai).
UPDATE refund_audit_logs
   SET to_status = 'MANUAL_TRANSFER_PENDING'
 WHERE action = 'MANUAL_TRANSFER_CONFIRMED'
   AND to_status = 'REFUND_PROCESSING';

UPDATE refund_audit_logs
   SET from_status = 'MANUAL_TRANSFER_PENDING'
 WHERE action = 'MANUAL_TRANSFER_CONFIRMED'
   AND from_status = 'REFUND_PROCESSING';

-- 4c) "Đã xác minh chuyển khoản thủ công thành công" — từ chờ chuyển khoản → REFUNDED.
UPDATE refund_audit_logs
   SET from_status = 'MANUAL_TRANSFER_PENDING'
 WHERE action = 'STATUS_UPDATED'
   AND to_status = 'REFUNDED'
   AND from_status = 'REFUND_PROCESSING';

-- 4d) Dòng "cập nhật trạng thái" chung — từ chờ chuyển khoản → REFUNDED.
UPDATE refund_audit_logs
   SET from_status = 'MANUAL_TRANSFER_PENDING'
 WHERE from_status = 'REFUND_PROCESSING'
   AND to_status = 'REFUNDED';
