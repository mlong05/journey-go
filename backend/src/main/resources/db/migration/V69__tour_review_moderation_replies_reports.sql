-- =====================================================================================
--  V69 - Lich su kiem duyet danh gia tour + phan hoi can duyet cua doi tac
--
--  MUC DO:
--    1. `tour_customer_review_moderation_history` — moi thao tac kiem duyet (an /
--       khoi phuc danh gia) deu duoc ghi lai: ai lam, luc nao, ly do gi, tu trang
--       thai nao sang trang thai nao. Truoc day chi con 3 cot tren bang danh gia
--       (hidden_reason / hidden_by / hidden_at) ⇒ KHONG tra cuoc duoc lich su
--       (an roi khoi phuc lai thi mat het dau vet).
--    2. `tour_customer_review_replies` — phan hoi cua doi tac PHAI qua kiem duyet
--       (E2c): doi tac viet => PENDING, chua hien thi cong khai; moderator duyet =>
--       APPROVED va hien thi; tu choi => REJECTED.
--    3. `tour_customer_review_reports` — du khach bao cao danh gia vi pham
--       (E2e / D1): danh gia bi report => tao 1 report moi cho moi lan bao cao
--       (mot review co the bi bao cao nhieu lan boi nhieu nguoi).
--
--  Idempotent: CREATE TABLE IF NOT EXISTS.
-- =====================================================================================

-- ── 1. Lich su kiem duyet danh gia ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tour_customer_review_moderation_history (
    id              BIGSERIAL PRIMARY KEY,
    review_id       BIGINT       NOT NULL REFERENCES tour_customer_reviews (id) ON DELETE CASCADE,
    -- Thao tac: HIDDEN / RESTORED
    action          VARCHAR(30)  NOT NULL,
    -- Tu trang thai -> toi trang thai
    from_status     VARCHAR(30),
    to_status       VARCHAR(30),
    actor_id        BIGINT       REFERENCES users (id) ON DELETE SET NULL,
    actor_name      VARCHAR(150),
    -- Ly do (bat buoc khi an)
    reason          VARCHAR(500),
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_mod_history_review  ON tour_customer_review_moderation_history (review_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_mod_history_actor   ON tour_customer_review_moderation_history (actor_id);

-- ── 2. Phan hoi cua doi tac (can duyet) ────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tour_customer_review_replies (
    id              BIGSERIAL PRIMARY KEY,
    review_id       BIGINT       NOT NULL REFERENCES tour_customer_reviews (id) ON DELETE CASCADE,
    content         TEXT         NOT NULL,
    -- PENDING / APPROVED / REJECTED
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    author_id       BIGINT       REFERENCES users (id) ON DELETE SET NULL,
    author_name     VARCHAR(150),
    -- Moderator xu ly
    moderator_id    BIGINT       REFERENCES users (id) ON DELETE SET NULL,
    moderator_name  VARCHAR(150),
    decision_reason VARCHAR(500),
    decided_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_review_replies_review ON tour_customer_review_replies (review_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_review_replies_status ON tour_customer_review_replies (status);

-- ── 3. Bao cao danh gia vi pham ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tour_customer_review_reports (
    id              BIGSERIAL PRIMARY KEY,
    review_id       BIGINT       NOT NULL REFERENCES tour_customer_reviews (id) ON DELETE CASCADE,
    reporter_id     BIGINT       REFERENCES users (id) ON DELETE SET NULL,
    reporter_name   VARCHAR(150),
    -- Ly do bao cao (free text)
    reason          VARCHAR(1000) NOT NULL,
    -- Trang thai xu ly: PENDING / RESOLVED / DISMISSED
    status          VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    resolution      VARCHAR(500),
    handled_by      BIGINT       REFERENCES users (id) ON DELETE SET NULL,
    handled_at      TIMESTAMPTZ,
    created_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Mot nguoi chi bao cao MOT LAN cho mot danh gia.
CREATE UNIQUE INDEX IF NOT EXISTS uk_review_report_reporter_review
    ON tour_customer_review_reports (reporter_id, review_id);
CREATE INDEX IF NOT EXISTS idx_review_reports_review ON tour_customer_review_reports (review_id);
CREATE INDEX IF NOT EXISTS idx_review_reports_status ON tour_customer_review_reports (status);
