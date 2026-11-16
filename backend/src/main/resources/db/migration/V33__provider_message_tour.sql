-- =====================================================================================
--  V26 -- Moi tin nhan "chat voi nha tour" ghi lai tour dang hoi
-- =====================================================================================
--  Ly do:
--   Moi cap (du khach, nha tour) chi co MOT cuoc tro chuyen; provider_conversations.tour_id
--   chi luu tour hoi gan nhat => khi du khach hoi nhieu tour cua cung nha tour, khong biet
--   tin nao hoi ve tour nao. Them tour_id tren tung tin nhan de hien "the tour" dung cho.
--
--  Tin nhan cu: de NULL (khong biet chinh xac tour) -- giao dien chi khong hien the tour.
--  AN TOAN & IDEMPOTENT: ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
-- =====================================================================================

ALTER TABLE provider_messages
    ADD COLUMN IF NOT EXISTS tour_id BIGINT;

CREATE INDEX IF NOT EXISTS idx_provider_messages_tour
    ON provider_messages (tour_id);

-- =====================================================================================
--  Het V26.
-- =====================================================================================
