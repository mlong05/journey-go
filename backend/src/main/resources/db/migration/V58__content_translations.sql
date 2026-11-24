-- Bảng cache bản dịch dùng chung cho vùng miền, chủ đề, tiêu đề tour danh sách,
-- câu chuyện văn hóa điểm dừng, câu hỏi quiz và manh mối nhiệm vụ (en / ja).
CREATE TABLE IF NOT EXISTS content_translations (
    id BIGSERIAL PRIMARY KEY,
    entity_type VARCHAR(40) NOT NULL,
    entity_id BIGINT NOT NULL,
    locale VARCHAR(5) NOT NULL,
    source_hash VARCHAR(64) NOT NULL,
    translated_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_content_translations_entity_locale UNIQUE (entity_type, entity_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_content_translations_lookup
    ON content_translations (entity_type, locale, entity_id);
