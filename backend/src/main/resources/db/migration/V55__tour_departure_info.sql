-- ═══════════════════════════════════════════════════════════════════════════════
-- V47 — Thông tin khởi hành của tour (dùng chung cho mọi ngày khởi hành)
--
-- Đối tác nhập dạng chữ tự do ở bước "Lịch khởi hành":
--   departure_time  giờ khởi hành, ví dụ "08:00 sáng"         (bắt buộc khi gửi duyệt)
--   meeting_point   địa điểm tập trung                         (bắt buộc khi gửi duyệt)
--   pickup_info     giờ đón và điểm đón                        (không bắt buộc)
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE tours ADD COLUMN IF NOT EXISTS departure_time VARCHAR(100);
ALTER TABLE tours ADD COLUMN IF NOT EXISTS meeting_point VARCHAR(500);
ALTER TABLE tours ADD COLUMN IF NOT EXISTS pickup_info VARCHAR(1000);
