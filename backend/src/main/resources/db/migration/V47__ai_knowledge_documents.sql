-- =====================================================================================
--  V43 — Admin Context & Rule Documents for AI Virtual Guide (RAG + Dynamic Rules)
-- =====================================================================================

-- 1. Cho phép ai_knowledge_chunks.destination_id nhận NULL để lưu tri thức GLOBAL
--    (ví dụ: chính sách nền tảng, FAQ chung, điều khoản hoàn tiền)
ALTER TABLE ai_knowledge_chunks ALTER COLUMN destination_id DROP NOT NULL;

-- 2. Bảng quản lý tài liệu Context & Rule do Admin / Moderator nạp
CREATE TABLE IF NOT EXISTS ai_knowledge_documents (
    id              BIGSERIAL PRIMARY KEY,
    title           VARCHAR(200) NOT NULL,
    doc_type        VARCHAR(40)  NOT NULL,                    -- PLATFORM_POLICY, CULTURAL_SUPPLEMENT, FAQ, AI_RULE
    scope           VARCHAR(20)  NOT NULL DEFAULT 'GLOBAL',   -- GLOBAL, DESTINATION
    destination_id  BIGINT,                                   -- Nullable; chỉ định khi scope = DESTINATION
    file_name       VARCHAR(255),
    file_type       VARCHAR(30),                              -- TXT, MD, DOCX, PDF, TEXT
    file_size       BIGINT       NOT NULL DEFAULT 0,
    file_url        VARCHAR(1000),                            -- URL file gốc trên Cloudinary (resource_type=raw)
    file_public_id  VARCHAR(255),                             -- Public ID Cloudinary để xóa khi hủy tài liệu
    raw_text        TEXT         NOT NULL,
    active          BOOLEAN      NOT NULL DEFAULT TRUE,
    chunk_count     INT          NOT NULL DEFAULT 0,
    uploaded_by     BIGINT,
    created_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at      TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_ai_docs_type_active ON ai_knowledge_documents(doc_type, active);
CREATE INDEX IF NOT EXISTS idx_ai_docs_scope_dest ON ai_knowledge_documents(scope, destination_id);
