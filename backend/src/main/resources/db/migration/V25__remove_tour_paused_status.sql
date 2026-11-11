-- =====================================================================================
--  V25 -- Gỡ trạng thái tour "PAUSED" (Tạm ngừng bán).
--
--  Lý do:
--    Chức năng "Tạm ngừng / Mở bán lại" KHÔNG nằm trong yêu cầu nghiệp vụ ⇒ đã gỡ
--    khỏi giao diện đối tác, API backend (PATCH /provider/tours/{id}/pause|resume)
--    và enum TourStatus.
--
--  AN TOÀN & IDEMPOTENT:
--   - Các tour đang ở trạng thái PAUSED được đưa về PUBLISHED (đã duyệt, đang bán)
--     để không tour nào bị "mất" khỏi sàn.
--   - Gỡ CHECK constraint của cột status nếu có (Hibernate có thể đã sinh).
-- =====================================================================================

UPDATE tours SET status = 'PUBLISHED', approved = TRUE WHERE status = 'PAUSED';

ALTER TABLE tours DROP CONSTRAINT IF EXISTS tours_status_check;

-- =====================================================================================
--  Het V25.
-- =====================================================================================
