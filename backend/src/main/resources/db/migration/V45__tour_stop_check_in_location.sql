-- ═══════════════════════════════════════════════════════════════════════════════
-- V45 — Vị trí check-in riêng cho điểm đến của tour 6 bước
--
-- Bối cảnh:
--   Trước đây `tour_stops` không có toạ độ: khi du khách check-in trạm, hệ thống mượn
--   checkpoint của hoạt động trải nghiệm đầu tiên (bán kính cố định 300 m). Đối tác không
--   thấy điều này trên giao diện ⇒ ghim đặt nhầm chỗ mà không ai biết.
--
-- Thay đổi:
--   1. Thêm latitude / longitude / check_in_radius_meters (đối tác tự nhập, 50–500 m).
--   2. Backfill tour cũ: lấy checkpoint đầu tiên có toạ độ (theo thứ tự hoạt động),
--      bán kính 300 m — giữ nguyên hành vi check-in hiện tại cho tour đang bán.
-- ═══════════════════════════════════════════════════════════════════════════════

ALTER TABLE tour_stops ADD COLUMN IF NOT EXISTS latitude NUMERIC(10, 7);
ALTER TABLE tour_stops ADD COLUMN IF NOT EXISTS longitude NUMERIC(10, 7);
ALTER TABLE tour_stops ADD COLUMN IF NOT EXISTS check_in_radius_meters INTEGER;

UPDATE tour_stops s
SET latitude  = e.checkpoint_latitude,
    longitude = e.checkpoint_longitude,
    check_in_radius_meters = COALESCE(s.check_in_radius_meters, 300)
FROM (
    SELECT DISTINCT ON (stop_id) stop_id, checkpoint_latitude, checkpoint_longitude
    FROM tour_stop_experiences
    WHERE checkpoint_latitude IS NOT NULL AND checkpoint_longitude IS NOT NULL
    ORDER BY stop_id, sequence_order
) e
WHERE e.stop_id = s.id
  AND s.latitude IS NULL
  AND s.longitude IS NULL;
