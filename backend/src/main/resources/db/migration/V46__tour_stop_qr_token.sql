-- ═══════════════════════════════════════════════════════════════════════════════
-- V46 — Mã QR check-in trạm cho điểm đến của tour 6 bước
--
-- Check-in trạm: GPS (trong bán kính) HOẶC quét mã QR dán tại cổng điểm đến.
-- Mã dạng JGS-<16 ký tự hex in hoa>, cấp cho mọi điểm đến đã có để đối tác in ngay.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE tour_stops ADD COLUMN IF NOT EXISTS qr_token VARCHAR(40);

UPDATE tour_stops
SET qr_token = 'JGS-' || upper(substr(md5(random()::text || id::text || clock_timestamp()::text), 1, 16))
WHERE qr_token IS NULL;
