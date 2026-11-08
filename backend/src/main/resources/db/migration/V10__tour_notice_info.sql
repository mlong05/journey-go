-- Bước 1 — "Những thông tin cần lưu ý" (không bắt buộc), hiển thị dạng mục xổ xuống cho khách.
ALTER TABLE tours ADD COLUMN IF NOT EXISTS price_includes TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS price_excludes TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS force_majeure  TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS contact_info   TEXT;
