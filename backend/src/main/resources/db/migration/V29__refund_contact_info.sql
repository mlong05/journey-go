-- =====================================================================================
--  V29 — Bổ sung thông tin liên hệ + lý do ngắn gọn cho yêu cầu hoàn tiền.
--
--  ── Vì sao có migration này? ──
--  Form hoàn tiền trên MOBILE được đơn giản hoá:
--    • Khách KHÔNG chọn nhóm lý do / mã lý do cụ thể nữa.
--      Chỉ mô tả bằng văn bản (1 dòng ngắn + 1 mô tả chi tiết).
--      Việc phân loại vào nhóm/mã lý do là quyết định của ADMIN khi duyệt.
--    • Khách cung cấp thêm SỐ ĐIỆN THOẠI + EMAIL DỰ PHÒNG để Admin liên hệ
--      hỗ trợ khi cần (VD: yêu cầu bị từ chối cần làm rõ thêm).
--
--  Cột mới:
--    • reason_summary  — lý do ngắn gọn do khách nhập (VD: "Bị ốm đột xuất")
--    • contact_phone   — số điện thoại liên hệ
--    • contact_email   — email dự phòng
--
--  ── Ghi chú về dữ liệu cũ ──
--  Yêu cầu cũ (đã tạo từ form cũ) KHÔNG có `reason_summary` / `contact_*`
--  ⇒ để NULL. Form chi tiết ở admin hiển thị "—" cho các trường này.
--  Không cần backfill: `reason_detail` cũ vẫn giữ nguyên và vẫn hiển thị đầy đủ.
-- =====================================================================================

ALTER TABLE refund_requests
    ADD COLUMN IF NOT EXISTS reason_summary VARCHAR(200),
    ADD COLUMN IF NOT EXISTS contact_phone   VARCHAR(20),
    ADD COLUMN IF NOT EXISTS contact_email   VARCHAR(150);

-- ── Index phục trợ tìm kiếm theo email / số điện thoại khi Admin tra cứu ────────
CREATE INDEX IF NOT EXISTS idx_refund_contact_email
    ON refund_requests (contact_email);

CREATE INDEX IF NOT EXISTS idx_refund_contact_phone
    ON refund_requests (contact_phone);
