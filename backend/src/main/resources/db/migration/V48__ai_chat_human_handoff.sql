-- =====================================================================================
--  V44 — Hỗ trợ chuyển tiếp trò chuyện trực tiếp với Admin / Content Moderator (Handoff)
-- =====================================================================================

ALTER TABLE ai_chat_sessions
    ADD COLUMN IF NOT EXISTS handoff_status VARCHAR(20) NOT NULL DEFAULT 'AI_ACTIVE',
    ADD COLUMN IF NOT EXISTS handoff_requested_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS handoff_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS assigned_staff_id BIGINT,
    ADD COLUMN IF NOT EXISTS assigned_staff_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS assigned_staff_role VARCHAR(30);

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_handoff
    ON ai_chat_sessions(handoff_status, updated_at DESC);

ALTER TABLE ai_chat_messages
    ADD COLUMN IF NOT EXISTS sender_id BIGINT,
    ADD COLUMN IF NOT EXISTS sender_name VARCHAR(150),
    ADD COLUMN IF NOT EXISTS sender_role VARCHAR(30);
