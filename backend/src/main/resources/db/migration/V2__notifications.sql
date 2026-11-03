-- =====================================================================================
--  V2 — Thông báo trong ứng dụng (cái chuông) cho Admin / Moderator / Provider / Du khách
-- =====================================================================================
--  Mỗi người nhận một dòng (thông báo gửi cả nhóm được nhân ra theo từng người) để
--  trạng thái đã đọc là riêng của từng người. Idempotent như V1.
-- =====================================================================================

CREATE TABLE IF NOT EXISTS notifications (
    id                BIGSERIAL PRIMARY KEY,
    recipient_id      BIGINT       NOT NULL,
    type              VARCHAR(50)  NOT NULL,
    title             VARCHAR(200) NOT NULL,
    body              TEXT,
    link              VARCHAR(500),
    ref_type          VARCHAR(50),
    ref_id            BIGINT,
    read_at           TIMESTAMPTZ,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Danh sách của tôi (mới nhất trước) và đếm chưa đọc
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_created
    ON notifications (recipient_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient_unread
    ON notifications (recipient_id) WHERE read_at IS NULL;
