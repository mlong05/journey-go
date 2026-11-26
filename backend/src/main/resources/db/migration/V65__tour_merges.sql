-- ═══════════════════════════════════════════════════════════════════════════════
-- V65 — B2B 1-1 Shared-Leg Tour Merge (tour_merges)
--
-- Supports strict 1-1 tour slot merging between 2 providers (or 2 different tours)
-- sharing prefix stops on the same departure date.
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tour_merges (
    id                      BIGSERIAL PRIMARY KEY,
    host_slot_id            BIGINT NOT NULL REFERENCES tour_slots(id),
    guest_slot_id           BIGINT NOT NULL REFERENCES tour_slots(id),
    initiator_provider_id   BIGINT NOT NULL REFERENCES users(id),
    target_provider_id      BIGINT NOT NULL REFERENCES users(id),
    departure_date          DATE NOT NULL,
    merged_departure_time   TIME NOT NULL,
    merged_meeting_point    TEXT NOT NULL,
    merged_capacity         INT NOT NULL CHECK (merged_capacity > 0),
    target_confirmed        BOOLEAN NOT NULL DEFAULT FALSE,
    target_confirmed_at     TIMESTAMPTZ,
    status                  VARCHAR(30) NOT NULL DEFAULT 'PENDING_PROVIDER'
                            CHECK (status IN ('PENDING_PROVIDER', 'PENDING_MOD', 'APPROVED', 'REJECTED', 'CANCELLED')),
    approved_by_mod_id      BIGINT REFERENCES users(id),
    note                    TEXT,
    reject_reason           TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT chk_tour_merges_diff_slots CHECK (host_slot_id <> guest_slot_id)
);

CREATE INDEX IF NOT EXISTS idx_tour_merges_host_slot
    ON tour_merges (host_slot_id);

CREATE INDEX IF NOT EXISTS idx_tour_merges_guest_slot
    ON tour_merges (guest_slot_id);

CREATE INDEX IF NOT EXISTS idx_tour_merges_status
    ON tour_merges (status);

CREATE INDEX IF NOT EXISTS idx_tour_merges_initiator
    ON tour_merges (initiator_provider_id, status);

CREATE INDEX IF NOT EXISTS idx_tour_merges_target
    ON tour_merges (target_provider_id, status);

-- Enforce 1-1 invariant at DB level per column for active merges
-- (Cross-column uniqueness host_slot_id vs guest_slot_id is also enforced in service/validation with locks).
CREATE UNIQUE INDEX IF NOT EXISTS uk_tour_merges_active_host_slot
    ON tour_merges (host_slot_id)
    WHERE status IN ('PENDING_PROVIDER', 'PENDING_MOD', 'APPROVED');

CREATE UNIQUE INDEX IF NOT EXISTS uk_tour_merges_active_guest_slot
    ON tour_merges (guest_slot_id)
    WHERE status IN ('PENDING_PROVIDER', 'PENDING_MOD', 'APPROVED');
