-- =====================================================================================
--  V51 — Rút gọn mô tả nhóm "Lỗi khách hàng" (PERSONAL).
--
--  ── Vì sao? ──
--  Mô tả cũ (do V50 đặt) là một đoạn văn dài liệt kê lại TOÀN BỘ chính sách
--  3 bậc:
--    "Khách hàng chủ động hủy vì lý do cá nhân. Từ 7 ngày trở lên trước khởi
--     hành hoàn 80%; từ 3 đến 6 ngày (72 giờ - 6 ngày) hoàn 50%; dưới 72 giờ
--     (3 ngày) hoặc không xuất hiện hoàn 0%."
--
--  Đoạn này hiện dưới ô "Lý do cụ thể" (hint) ⇒ Admin thấy CHÍNH SÁCH bị lặp
--  lại ở 2 nơi (vừa ở hint, vừa ở khối "Mốc thời gian áp dụng chính sách"),
--  gây rối + sai lệch khi bậc 0% đã bỏ nhánh "không xuất hiện".
--
--  ⇒ Ở đây chỉ giữ lại MỘT câu ngắn gọn mô tả ý nghĩa của nhóm; các bậc /
--  tỷ lệ do khối "Mốc thời gian áp dụng chính sách" hiển thị riêng.
--
--  ── Vì sao UPDATE chứ không sửa file V50? ──
--  Flyway bật `validate-on-migrate: true` ⇒ SỬA NỘI DUNG file V50 đã được
--  áp dụng sẽ làm checksum không khớp và app KHÔNG KHỞI ĐỘNG ĐƯỢC.
--  Mọi thay đổi dữ liệu phải nằm ở migration MỚI.
--
--  Migration này idempotent (UPDATE theo `code`) ⇒ chạy lại nhiều lần vẫn an toàn.
-- =====================================================================================

UPDATE refund_reason_groups
SET description = 'Khách hàng chủ động hủy đơn vì lý do cá nhân.'
WHERE code = 'PERSONAL';
