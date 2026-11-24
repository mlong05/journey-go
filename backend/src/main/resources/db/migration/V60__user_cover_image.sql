-- Ảnh bìa trang hồ sơ du khách ("hộ chiếu du lịch"). NULL = dùng ảnh mặc định
-- (ảnh chuyến đi gần nhất / ảnh phong cảnh có sẵn).
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
