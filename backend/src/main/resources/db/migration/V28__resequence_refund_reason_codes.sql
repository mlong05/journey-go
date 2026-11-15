-- ── Đánh số lại thứ tự hiển thị của mã lý do hoàn tiền ──────────────────────────
--
-- Vấn đề:
--   `refund_reason_codes.display_order` được gán 1..N lúc tạo. Khi Admin xóa mã ở
--   giữa danh sách, các mã còn lại GIỮ NGUYÊN số cũ ⇒ STT hiển thị bị lỗi
--   (VD: xóa số 7, 8 ⇒ danh sách hiện 1 2 3 4 5 6 9 10 11 12).
--
-- Cách sửa:
--   Gán lại `display_order` liên tục 1..N cho từng nhóm, theo đúng thứ tự hiện tại
--   (ORDER BY display_order ASC, id ASC ⇒ giữ nguyên thứ tự người dùng đang thấy,
--    chỉ đánh số lại cho liền mạch).
--
--   Ứng dụng backend cũng tự đánh số lại sau mỗi lần xóa (xem
--   `RefundReasonConfigService#resequenceGroup`) ⇒ migration này chỉ dọn dữ liệu
--   cũ đang bị gap.
--
-- Idempotent: chạy lại nhiều lần vẫn cho cùng kết quả.

WITH ranked AS (
    SELECT
        id,
        ROW_NUMBER() OVER (
            PARTITION BY group_id
            ORDER BY display_order ASC, id ASC
        ) AS new_order
    FROM refund_reason_codes
)
UPDATE refund_reason_codes c
SET display_order = r.new_order
FROM ranked r
WHERE c.id = r.id
  AND c.display_order IS DISTINCT FROM r.new_order;
