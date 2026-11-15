-- =====================================================================================
--  V27 — Chuẩn hoá mô tả 4 nhóm lý do hoàn tiền (từ ngữ hướng tới người dùng).
--
--  ── Vì sao có migration này? ──
--  Mô tả nhóm lý do hiển thị cho KHÁCH trên web và mobile ⇒ phải dùng từ ngữ
--  khách hàng, không dùng từ ngữ nội bộ của hệ thống:
--    • "Tourist"            → "Khách hàng"
--    • "Content Provider"   → "Đối tác"
--    • "JourneyGo"          → "Nền tảng JourneyGo"
--
--  ── Vì sao UPDATE chứ không sửa file V26? ──
--  V26 có thể đã được áp dụng trên môi trường dev/prod. Flyway bật
--  `validate-on-migrate: true` ⇒ SỬA NỘI DUNG file V26 sẽ làm checksum
--  không khớp và app KHÔNG KHỞI ĐỘNG ĐƯỢC. Vì vậy mọi thay đổi dữ liệu phải
--  nằm ở migration MỚI.
--
--  Migration này idempotent (UPDATE theo `code`) ⇒ chạy lại nhiều lần vẫn an toàn.
-- =====================================================================================

-- ── 1. Lỗi khách hàng (PERSONAL) ────────────────────────────────────────────────
--    "Tourist chủ động hủy" → "Khách hàng chủ động hủy"
UPDATE refund_reason_groups
SET description = 'Khách hàng chủ động hủy vì lý do cá nhân. Hoàn 50% nếu hủy trước 3 ngày khởi hành; hoàn 0% nếu hủy trong vòng 48 giờ hoặc không xuất hiện.'
WHERE code = 'PERSONAL';

-- ── 2. Lỗi nền tảng (PLATFORM_FAULT) ───────────────────────────────────────────
--    "JourneyGo gây ra sự cố" → "Nền tảng JourneyGo gây ra sự cố"
UPDATE refund_reason_groups
SET description = 'Nền tảng JourneyGo gây ra sự cố khiến khách không thể sử dụng dịch vụ đã đặt. Hoàn 100% toàn bộ số tiền.'
WHERE code = 'PLATFORM_FAULT';

-- ── 3. Lỗi đối tác (PROVIDER_FAULT) ────────────────────────────────────────────
--    "Content Provider không tổ chức" → "Đối tác không tổ chức"
UPDATE refund_reason_groups
SET description = 'Đối tác không tổ chức hoặc tổ chức không đúng cam kết. Hoàn 100% toàn bộ số tiền.'
WHERE code = 'PROVIDER_FAULT';

-- ── 4. Lỗi bất khả kháng (FORCE_MAJEURE) ───────────────────────────────────────
--    Chuẩn hoá câu cho đồng nhất với 3 nhóm trên (bỏ mệnh đề thừa).
UPDATE refund_reason_groups
SET description = 'Thiên tai, bão lũ, động đất, dịch bệnh hoặc quyết định hạn chế của cơ quan nhà nước. Theo chính sách hiện hành không hoàn tiền.'
WHERE code = 'FORCE_MAJEURE';
