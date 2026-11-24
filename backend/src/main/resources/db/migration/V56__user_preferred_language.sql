-- Lưu ngôn ngữ giao diện ưa thích (vi / en / ja) theo từng tài khoản để đồng bộ Web <-> Mobile.
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS preferred_language VARCHAR(5) NOT NULL DEFAULT 'vi';
