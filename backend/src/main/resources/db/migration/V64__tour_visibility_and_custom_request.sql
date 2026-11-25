-- =====================================================================================
-- V45: Tour visibility (ALL / SPECIFIC_USER) and custom tour requests
-- =====================================================================================

-- ── 1. Add visibility columns to tours ─────────────────────────────────────────
ALTER TABLE tours ADD COLUMN IF NOT EXISTS visibility           VARCHAR(20) NOT NULL DEFAULT 'ALL';
ALTER TABLE tours ADD COLUMN IF NOT EXISTS specific_user_email  VARCHAR(100);
ALTER TABLE tours ADD COLUMN IF NOT EXISTS tour_request_id      BIGINT;

CREATE INDEX IF NOT EXISTS idx_tours_visibility ON tours (visibility);
CREATE INDEX IF NOT EXISTS idx_tours_specific_user_email ON tours (specific_user_email);
CREATE INDEX IF NOT EXISTS idx_tours_tour_request_id ON tours (tour_request_id);

-- ── 2. Create tour_requests table ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS tour_requests (
    id                      BIGSERIAL PRIMARY KEY,
    requester_id            BIGINT NOT NULL REFERENCES users(id),
    title                   VARCHAR(200) NOT NULL,
    description             TEXT NOT NULL,
    preferred_destination   VARCHAR(500),
    preferred_date_from     DATE,
    preferred_date_to       DATE,
    guest_count             INTEGER,
    budget_min              DECIMAL(15,2),
    budget_max              DECIMAL(15,2),
    special_requirements    TEXT,
    status                  VARCHAR(30) NOT NULL DEFAULT 'OPEN',
    accepted_by             BIGINT REFERENCES users(id),
    accepted_at             TIMESTAMPTZ,
    fulfilled_tour_id       BIGINT REFERENCES tours(tour_id),
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_tour_requests_status ON tour_requests (status);
CREATE INDEX IF NOT EXISTS idx_tour_requests_requester ON tour_requests (requester_id);
CREATE INDEX IF NOT EXISTS idx_tour_requests_accepted_by ON tour_requests (accepted_by);
