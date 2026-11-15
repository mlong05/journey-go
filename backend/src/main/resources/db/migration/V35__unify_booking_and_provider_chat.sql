-- =====================================================================================
--  V33 — Gộp "chat trong đơn" vào "chat với nhà tour" thành MỘT kênh liên lạc.
--
--  ── Vì sao có migration này? ──
--  Trước đây có HAI hệ thống chat song song:
--    1. `booking_messages`  — khung "Hỗ trợ trong đơn này" (chỉ dùng được SAU khi đặt tour).
--    2. `provider_messages` — mục "Tin nhắn với nhà tour" (dùng được cả TRƯỚC khi đặt).
--  Về bản chất đây là CÙNG MỘT kênh liên lạc giữa du khách và nhà tour ⇒ gộp lại:
--    • `provider_messages.booking_id`  — NULL = hỏi trước khi đặt; có giá trị = gửi trong đơn.
--    • `provider_conversations.booking_id` — đơn đặt tour liên quan (để hiển thị "Đơn #MÃ").
--
--  ── AN TOÀN & IDEMPOTENT ──
--  • `ADD COLUMN IF NOT EXISTS` ⇒ chạy lại nhiều lần vẫn an toàn.
--  • Dữ liệu `booking_messages` cũ được CHUYỂN sang `provider_messages` (không mất lịch sử).
--  • Bảng `booking_messages` được GIỮ LẠI (không xoá) để dữ liệu cũ vẫn đối chiếu được.
-- =====================================================================================

-- ── 1. Cột mới: liên kết tin nhắn / hội thoại với đơn đặt tour ─────────────────
ALTER TABLE provider_messages     ADD COLUMN IF NOT EXISTS booking_id BIGINT;
ALTER TABLE provider_conversations ADD COLUMN IF NOT EXISTS booking_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_provider_messages_booking
    ON provider_messages (booking_id);

-- ── 2. Tạo hội thoại cho các đơn hợp lệ chưa có hội thoại ──────────────────────
--  Mỗi cặp (du khách, nhà tour) chỉ có MỘT hội thoại (khoá duy nhất sẵn có).
INSERT INTO provider_conversations
    (tourist_id, provider_id, tour_id, subject, booking_id, created_at, updated_at)
SELECT DISTINCT ON (b.tourist_id, t.created_by)
       b.tourist_id, t.created_by, b.tour_id, t.title, b.id, NOW(), NOW()
FROM bookings b
JOIN tours t ON t.tour_id = b.tour_id
WHERE t.created_by IS NOT NULL
  AND b.status NOT IN ('CANCELLED', 'EXPIRED')
ORDER BY b.tourist_id, t.created_by, b.created_at DESC
ON CONFLICT (tourist_id, provider_id) DO NOTHING;

-- ── 3. Gắn `booking_id` cho hội thoại ĐÃ TỒN TẠI (mở trước khi đặt tour) ───────
--  Lấy đơn gần nhất của cặp (du khách, nhà tour) còn hiệu lực.
UPDATE provider_conversations pc
SET booking_id = sub.booking_id
FROM (
    SELECT DISTINCT ON (b.tourist_id, t.created_by)
           b.tourist_id, t.created_by, b.id AS booking_id
    FROM bookings b
    JOIN tours t ON t.tour_id = b.tour_id
    WHERE t.created_by IS NOT NULL
      AND b.status NOT IN ('CANCELLED', 'EXPIRED')
    ORDER BY b.tourist_id, t.created_by, b.created_at DESC
) sub
WHERE pc.tourist_id = sub.tourist_id
  AND pc.provider_id = sub.created_by
  AND pc.booking_id IS NULL;

-- ── 4. Chuyển lịch sử `booking_messages` sang `provider_messages` ────────────────
INSERT INTO provider_messages (conversation_id, sender_id, body, booking_id, created_at, read_at)
SELECT pc.id, bm.sender_id, bm.body, bm.booking_id, bm.created_at, bm.read_at
FROM booking_messages bm
JOIN bookings b ON b.id = bm.booking_id
JOIN tours t ON t.tour_id = b.tour_id
JOIN provider_conversations pc
      ON pc.tourist_id = b.tourist_id
     AND pc.provider_id = t.created_by
WHERE t.created_by IS NOT NULL
  -- Chống nhân bản nếu migration chạy lại.
  AND NOT EXISTS (
      SELECT 1 FROM provider_messages pm
      WHERE pm.booking_id = bm.booking_id
        AND pm.sender_id = bm.sender_id
        AND pm.created_at = bm.created_at
        AND pm.body = bm.body
  );

-- ── 5. Cập nhật `last_message_at` của hội thoại theo tin nhắn mới nhất ──────────
UPDATE provider_conversations pc
SET last_message_at = sub.mx
FROM (
    SELECT conversation_id, MAX(created_at) AS mx
    FROM provider_messages
    GROUP BY conversation_id
) sub
WHERE pc.id = sub.conversation_id
  AND (pc.last_message_at IS NULL OR pc.last_message_at < sub.mx);

-- =====================================================================================
--  Het V33.
-- =====================================================================================
