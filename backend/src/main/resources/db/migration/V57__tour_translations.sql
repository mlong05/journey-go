-- Cache bản dịch nội dung tour công khai (en / ja) sinh tự động qua Gemini, kèm source_hash để tự làm mới khi tour bị sửa.
CREATE TABLE IF NOT EXISTS tour_translations (
    id BIGSERIAL PRIMARY KEY,
    tour_id BIGINT NOT NULL REFERENCES tours(tour_id) ON DELETE CASCADE,
    locale VARCHAR(5) NOT NULL,
    source_hash VARCHAR(64) NOT NULL,
    translated_json TEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_tour_translations_tour_locale UNIQUE (tour_id, locale)
);

CREATE INDEX IF NOT EXISTS idx_tour_translations_tour_locale
    ON tour_translations (tour_id, locale);
