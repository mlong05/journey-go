-- =====================================================================================
-- V7: Luồng đối tác tạo tour 5 bước + Moderator kiểm duyệt.
--
-- Viết idempotent (IF NOT EXISTS / IF EXISTS) vì:
--   * DB đang dùng: Flyway chạy TRƯỚC Hibernate → file này tạo bảng/cột.
--   * DB trống: file này chạy SAU Hibernate (xem FlywayConfig) → bảng/cột đã được
--     Hibernate tạo từ entity, các lệnh dưới đây không làm gì.
-- =====================================================================================

-- Duyệt đối tác dùng luồng đơn đăng ký (V6: partner_applications, /partner-register → /admin/partners).
-- Hồ sơ provider_profiles chỉ được tạo khi Admin duyệt đơn ⇒ không thêm cột trạng thái duyệt ở đây.

-- ── 1. Cấu hình điểm thưởng do Admin quản lý ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reward_settings (
    code       VARCHAR(40) PRIMARY KEY,
    points     INTEGER     NOT NULL,
    updated_by BIGINT      REFERENCES users(id),
    updated_at TIMESTAMPTZ
);
INSERT INTO reward_settings (code, points, updated_at) VALUES
    ('QUIZ_QUESTION', 10, NOW()),
    ('REAL_WORLD_EXPERIENCE', 50, NOW())
ON CONFLICT (code) DO NOTHING;

-- ── 2. Bảng tours: trường mới của bước 1, 2, 5 ───────────────────────────────────────
ALTER TABLE tours ADD COLUMN IF NOT EXISTS tour_format              VARCHAR(20);
ALTER TABLE tours ADD COLUMN IF NOT EXISTS duration_minutes         INTEGER;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS duration_nights          INTEGER;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS region_id                BIGINT REFERENCES regions(id);
ALTER TABLE tours ADD COLUMN IF NOT EXISTS theme_id                 BIGINT REFERENCES themes(id);
ALTER TABLE tours ADD COLUMN IF NOT EXISTS description              TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS cancellation_policy      TEXT;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS max_guests_per_slot      INTEGER;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS content_rights_confirmed BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS version_number           INTEGER NOT NULL DEFAULT 1;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS submitted_at             TIMESTAMPTZ;
ALTER TABLE tours ADD COLUMN IF NOT EXISTS published_at             TIMESTAMPTZ;

-- Enum TourStatus đổi PENDING → PENDING_REVIEW, thêm CHANGES_REQUESTED, PAUSED.
-- Hibernate có thể đã tạo CHECK constraint theo enum cũ → gỡ đi.
ALTER TABLE tours DROP CONSTRAINT IF EXISTS tours_status_check;
UPDATE tours SET status = 'PENDING_REVIEW' WHERE status = 'PENDING';

CREATE TABLE IF NOT EXISTS tour_highlights (
    tour_id  BIGINT       NOT NULL REFERENCES tours(tour_id) ON DELETE CASCADE,
    position INTEGER      NOT NULL,
    content  VARCHAR(300) NOT NULL,
    PRIMARY KEY (tour_id, position)
);

CREATE TABLE IF NOT EXISTS tour_images (
    tour_id   BIGINT        NOT NULL REFERENCES tours(tour_id) ON DELETE CASCADE,
    position  INTEGER       NOT NULL,
    image_url VARCHAR(1000) NOT NULL,
    PRIMARY KEY (tour_id, position)
);

-- ── 3. Giá vé, lịch khởi hành, slot ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tour_prices (
    id                 BIGSERIAL PRIMARY KEY,
    tour_id            BIGINT         NOT NULL REFERENCES tours(tour_id) ON DELETE CASCADE,
    guest_type         VARCHAR(20)    NOT NULL,
    price              NUMERIC(12, 2) NOT NULL DEFAULT 0,
    counts_toward_slot BOOLEAN        NOT NULL DEFAULT TRUE,
    CONSTRAINT uk_tour_prices_tour_guest UNIQUE (tour_id, guest_type)
);

CREATE TABLE IF NOT EXISTS tour_departure_dates (
    id             BIGSERIAL PRIMARY KEY,
    tour_id        BIGINT NOT NULL REFERENCES tours(tour_id) ON DELETE CASCADE,
    departure_date DATE   NOT NULL,
    CONSTRAINT uk_tour_departure_dates UNIQUE (tour_id, departure_date)
);

CREATE TABLE IF NOT EXISTS tour_slots (
    id           BIGSERIAL PRIMARY KEY,
    tour_id      BIGINT      NOT NULL REFERENCES tours(tour_id) ON DELETE CASCADE,
    slot_date    DATE        NOT NULL,
    capacity     INTEGER     NOT NULL,
    booked_count INTEGER     NOT NULL DEFAULT 0,
    status       VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tour_slots_tour_date UNIQUE (tour_id, slot_date)
);

-- ── 4. Điểm đến riêng của tour ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tour_stops (
    id                BIGSERIAL PRIMARY KEY,
    tour_id           BIGINT       NOT NULL REFERENCES tours(tour_id) ON DELETE CASCADE,
    sequence_order    INTEGER      NOT NULL,
    name              VARCHAR(200),
    short_description TEXT,
    guest_note        TEXT,
    image_url         VARCHAR(1000),
    cultural_content  TEXT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS idx_tour_stops_tour_seq ON tour_stops (tour_id, sequence_order);

CREATE TABLE IF NOT EXISTS tour_stop_cultural_images (
    stop_id   BIGINT        NOT NULL REFERENCES tour_stops(id) ON DELETE CASCADE,
    position  INTEGER       NOT NULL,
    image_url VARCHAR(1000) NOT NULL,
    PRIMARY KEY (stop_id, position)
);

CREATE TABLE IF NOT EXISTS tour_stop_artifacts (
    id                BIGSERIAL PRIMARY KEY,
    stop_id           BIGINT  NOT NULL REFERENCES tour_stops(id) ON DELETE CASCADE,
    sequence_order    INTEGER NOT NULL,
    name              VARCHAR(200),
    image_url         VARCHAR(1000),
    short_description TEXT,
    video_url         VARCHAR(1000),
    video_source      VARCHAR(20)
);

CREATE TABLE IF NOT EXISTS tour_stop_experiences (
    id                   BIGSERIAL PRIMARY KEY,
    stop_id              BIGINT  NOT NULL REFERENCES tour_stops(id) ON DELETE CASCADE,
    sequence_order       INTEGER NOT NULL,
    activity_name        VARCHAR(200),
    checkpoint_latitude  NUMERIC(10, 7),
    checkpoint_longitude NUMERIC(10, 7),
    radius_meters        INTEGER NOT NULL DEFAULT 50,
    duration_seconds     INTEGER,
    points_reward        INTEGER
);

-- Câu hỏi: QUIZ thuộc điểm đến (stop_id), POST_EXPERIENCE thuộc trải nghiệm (experience_id).
CREATE TABLE IF NOT EXISTS tour_stop_questions (
    id             BIGSERIAL PRIMARY KEY,
    stop_id        BIGINT REFERENCES tour_stops(id) ON DELETE CASCADE,
    experience_id  BIGINT REFERENCES tour_stop_experiences(id) ON DELETE CASCADE,
    kind           VARCHAR(20) NOT NULL,
    sequence_order INTEGER     NOT NULL,
    content        TEXT,
    points_reward  INTEGER
);

CREATE TABLE IF NOT EXISTS tour_stop_answers (
    id             BIGSERIAL PRIMARY KEY,
    question_id    BIGINT  NOT NULL REFERENCES tour_stop_questions(id) ON DELETE CASCADE,
    sequence_order INTEGER NOT NULL,
    content        TEXT,
    is_correct     BOOLEAN NOT NULL DEFAULT FALSE
);

-- ── 5. Kiểm duyệt: tour_reviews 1-nhiều, tiêu chí, ghi chú, lịch sử ─────────────────
ALTER TABLE tour_reviews DROP CONSTRAINT IF EXISTS tour_reviews_status_check;
ALTER TABLE tour_review_history DROP CONSTRAINT IF EXISTS tour_review_history_action_check;

-- Gỡ ràng buộc UNIQUE trên tour_reviews.tour_id (tên do Hibernate tự sinh).
DO $$
DECLARE
    c RECORD;
BEGIN
    IF to_regclass('tour_reviews') IS NULL THEN
        RETURN;
    END IF;
    FOR c IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_attribute att ON att.attrelid = con.conrelid AND att.attnum = ANY (con.conkey)
        WHERE con.conrelid = 'tour_reviews'::regclass
          AND con.contype = 'u'
          AND array_length(con.conkey, 1) = 1
          AND att.attname = 'tour_id'
    LOOP
        EXECUTE format('ALTER TABLE tour_reviews DROP CONSTRAINT %I', c.conname);
    END LOOP;
END $$;

ALTER TABLE tour_reviews ADD COLUMN IF NOT EXISTS tour_version         INTEGER;
ALTER TABLE tour_reviews ADD COLUMN IF NOT EXISTS crit_interactive     BOOLEAN;
ALTER TABLE tour_reviews ADD COLUMN IF NOT EXISTS crit_local_expertise BOOLEAN;
ALTER TABLE tour_reviews ADD COLUMN IF NOT EXISTS crit_storytelling    BOOLEAN;
ALTER TABLE tour_reviews ADD COLUMN IF NOT EXISTS crit_cultural_ratio  BOOLEAN;
ALTER TABLE tour_reviews ADD COLUMN IF NOT EXISTS crit_authentic_media BOOLEAN;
CREATE INDEX IF NOT EXISTS idx_tour_reviews_tour ON tour_reviews (tour_id);

ALTER TABLE tour_review_history ADD COLUMN IF NOT EXISTS from_status  VARCHAR(30);
ALTER TABLE tour_review_history ADD COLUMN IF NOT EXISTS to_status    VARCHAR(30);
ALTER TABLE tour_review_history ADD COLUMN IF NOT EXISTS tour_version INTEGER;

CREATE TABLE IF NOT EXISTS tour_review_notes (
    id         BIGSERIAL PRIMARY KEY,
    review_id  BIGINT      NOT NULL REFERENCES tour_reviews(id) ON DELETE CASCADE,
    step       VARCHAR(20) NOT NULL,
    stop_id    BIGINT,
    field      VARCHAR(100),
    note       TEXT        NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_tour_review_notes_review ON tour_review_notes (review_id);
