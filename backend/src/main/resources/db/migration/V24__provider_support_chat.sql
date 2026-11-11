-- =====================================================================================
--  V24 -- "Chat ho tro tu nha tour" (Pre-booking direct chat)
-- =====================================================================================
--  Muc dich:
--   Cho phep khach du lich NHAT CHUA MUA TOUR van nhan tin truc tiep voi doi tac
--   (Content Provider) so huu tour -- vi du hoi lich trinh, gia, thoi gian.
--
--   1. provider_conversations -- Moi cuoc tro chuyen giua 1 khach (tourist) va 1 doi tac.
--                                Khoa duy nhat (tourist_id, provider_id) => 1 doi tac duy nhat
--                                1 cuoc tro chuyen; `tour_id` luu tour da hoi gan nhat.
--   2. provider_messages     -- Cac tin nhan trong cuoc tro chuyen.
--
--  AN TOAN & IDEMPOTENT:
--   - CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
--   - Khong tao FK toi `users` (bang `users` co the chua ton tai luc Flyway chay tren DB moi).
-- =====================================================================================

-- ── 1. provider_conversations ─────────────────────────────────────────────────
--  - tourist_id : khach du lich (nguoi mo tro chuyen).
--  - provider_id: doi tac so hu tour (Content Provider) -- user_id cua `users`.
--  - tour_id    : tour ma khach dang xem/hoi (co the NULL).
CREATE TABLE IF NOT EXISTS provider_conversations (
    id              BIGSERIAL PRIMARY KEY,
    tourist_id      BIGINT       NOT NULL,
    provider_id     BIGINT       NOT NULL,
    tour_id         BIGINT,
    subject         VARCHAR(255),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    last_message_at TIMESTAMPTZ,
    CONSTRAINT uk_provider_conversation_pair
        UNIQUE (tourist_id, provider_id)
);

CREATE INDEX IF NOT EXISTS idx_provider_conversations_tourist
    ON provider_conversations (tourist_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_provider_conversations_provider
    ON provider_conversations (provider_id, updated_at DESC);

-- ── 2. provider_messages ──────────────────────────────────────────────────────
--  Chat truc tiep khach <-> doi tac (khong can da dat tour).
CREATE TABLE IF NOT EXISTS provider_messages (
    id              BIGSERIAL PRIMARY KEY,
    conversation_id BIGINT      NOT NULL,
    sender_id       BIGINT      NOT NULL,
    body            TEXT        NOT NULL,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at         TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_provider_messages_conversation
    ON provider_messages (conversation_id, created_at);

-- =====================================================================================
--  Het V24.
-- =====================================================================================
