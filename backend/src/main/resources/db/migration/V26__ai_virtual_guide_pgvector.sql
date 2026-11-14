-- =====================================================================================
--  V7 — AI Virtual Guide Module (pgvector + Vector Store + Chat Memory)
-- =====================================================================================
--  Nội dung:
--   1. CREATE EXTENSION vector (pgvector extension nếu có sẵn trên máy chủ)
--   2. ai_knowledge_chunks       — lưu các đoạn tri thức đã nhúng vector (768 chiều - Gemini text-embedding-004)
--   3. ai_chat_sessions          — quản lý phiên hỏi đáp của du khách tại điểm đến
--   4. ai_chat_messages          — lịch sử tin nhắn trong phiên (làm ngữ cảnh hội thoại / Memory)
--
--  AN TOÀN & ĐA MÔI TRƯỜNG:
--   • Tự động kiểm tra extension `vector`:
--     - Nếu môi trường đã cài pgvector (Docker / Production / Server): dùng kiểu vector(768) + HNSW index.
--     - Nếu môi trường dev local chưa cài binary pgvector: tự động fallback sang kiểu TEXT an toàn,
--       giúp toàn bộ ứng dụng vẫn khởi động thành công mà không bị crash Flyway.
--   • Bảng `users` và `destinations` do Hibernate (ddl-auto: update) quản lý.
--     Flyway chạy trước Hibernate nên KHÔNG dùng Foreign Key tham chiếu `users` / `destinations`.
--   • Bảng `ai_chat_messages` có FK tham chiếu `ai_chat_sessions(id)`.
-- =====================================================================================

-- ── 1. Kiểm tra pgvector & Tạo bảng ai_knowledge_chunks ────────────────────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_available_extensions WHERE name = 'vector') THEN
        CREATE EXTENSION IF NOT EXISTS vector;

        CREATE TABLE IF NOT EXISTS ai_knowledge_chunks (
            id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            source_id           VARCHAR(100) NOT NULL,          -- VD: "CULTURAL_CONTENT:12", "DESTINATION:5"
            destination_id      BIGINT NOT NULL,               -- Khớp Destination.id (BIGINT)
            content_type        VARCHAR(50) NOT NULL,          -- 'CULTURAL_STORY', 'TOUR_INFO', 'TASK_HINT'
            chunk_text          TEXT NOT NULL,                 -- Nội dung đã gắn Context Prefix
            metadata            JSONB,                         -- {"title": "...", "destination_name": "..."}
            embedding           vector(768) NOT NULL,          -- 768 chiều (Google text-embedding-004)
            created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );

        CREATE INDEX IF NOT EXISTS idx_ai_chunks_embedding ON ai_knowledge_chunks USING hnsw (embedding vector_cosine_ops);
    ELSE
        -- Fallback linh hoạt cho dev chạy Postgres trực tiếp trên Windows chưa cài đặt pgvector binary
        CREATE TABLE IF NOT EXISTS ai_knowledge_chunks (
            id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            source_id           VARCHAR(100) NOT NULL,
            destination_id      BIGINT NOT NULL,
            content_type        VARCHAR(50) NOT NULL,
            chunk_text          TEXT NOT NULL,
            metadata            JSONB,
            embedding           TEXT NOT NULL,
            created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_ai_chunks_destination ON ai_knowledge_chunks(destination_id);
CREATE INDEX IF NOT EXISTS idx_ai_chunks_source ON ai_knowledge_chunks(source_id);
CREATE INDEX IF NOT EXISTS idx_ai_chunks_content_type ON ai_knowledge_chunks(content_type);

-- ── 2. ai_chat_sessions ───────────────────────────────────────────────────────
-- Quản lý phiên trò chuyện giữa du khách và AI Virtual Guide
CREATE TABLE IF NOT EXISTS ai_chat_sessions (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id                 BIGINT NOT NULL,           -- Khớp User.id (BIGINT)
    current_destination_id  BIGINT,                    -- Điểm đến du khách đang đứng / quét QR
    created_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at              TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_user ON ai_chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_chat_sessions_destination ON ai_chat_sessions(current_destination_id);

-- ── 3. ai_chat_messages ───────────────────────────────────────────────────────
-- Lưu các lượt trao đổi trong phiên (User / Assistant) để làm Memory
CREATE TABLE IF NOT EXISTS ai_chat_messages (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id          UUID NOT NULL REFERENCES ai_chat_sessions(id) ON DELETE CASCADE,
    role                VARCHAR(20) NOT NULL,          -- 'USER' hoặc 'ASSISTANT'
    content             TEXT NOT NULL,
    created_at          TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_chat_messages_session ON ai_chat_messages(session_id);
