-- =====================================================================================
--  V3 — Quy trình tiếp nhận, phân công và kiểm duyệt đề xuất điểm đến từ Đối tác (Partner)
-- =====================================================================================
--  1. Partner gửi Destination Request (SUBMITTED)
--  2. Content Moderator kiểm tra tính hợp lệ & phù hợp (Lần 1): APPROVED hoặc REJECTED
--  3. Admin / Content Management phân công cho Content Provider (ASSIGNED)
--  4. Content Provider nghiên cứu, thiết kế và tạo Destination (IN_PROGRESS)
--  5. Content Provider nộp nội dung để duyệt (PENDING_CONTENT_REVIEW)
--  6. Content Moderator kiểm duyệt nội dung (Lần 2): COMPLETED (Publish) hoặc trả về IN_PROGRESS
--  7. Partner có thể hủy nếu cần (CANCELLED)
-- =====================================================================================

CREATE TABLE IF NOT EXISTS destination_requests (
    id                          BIGSERIAL PRIMARY KEY,
    partner_id                  BIGINT NOT NULL REFERENCES users(id),
    destination_name            VARCHAR(255) NOT NULL,
    location                    VARCHAR(255) NOT NULL,
    address                     TEXT NOT NULL,
    description                 TEXT,
    images                      TEXT,
    supporting_documents        TEXT,
    contact_name                VARCHAR(150),
    contact_phone               VARCHAR(50),
    contact_email               VARCHAR(150),
    contact_info                TEXT,
    request_reason              TEXT,

    status                      VARCHAR(35) NOT NULL DEFAULT 'SUBMITTED',

    -- Lần 1: Moderator kiểm tra tính hợp lệ & phù hợp
    moderator_id                BIGINT REFERENCES users(id),
    initial_review_note         TEXT,
    rejection_reason            VARCHAR(255),
    rejection_note              TEXT,
    initial_reviewed_at         TIMESTAMPTZ,

    -- Admin phân công CP
    assigned_by_id              BIGINT REFERENCES users(id),
    assigned_cp_id              BIGINT REFERENCES users(id),
    assigned_at                 TIMESTAMPTZ,
    assignment_note             TEXT,

    -- Destination do CP liên kết / tạo ra
    destination_id              BIGINT REFERENCES destinations(id),
    content_submitted_at        TIMESTAMPTZ,

    -- Lần 2: Moderator kiểm duyệt nội dung hoàn chỉnh
    content_moderator_id        BIGINT REFERENCES users(id),
    content_review_note         TEXT,
    content_rejection_reason    TEXT,
    content_reviewed_at         TIMESTAMPTZ,

    -- Hoàn tất / Hủy
    completed_at                TIMESTAMPTZ,
    cancelled_at                TIMESTAMPTZ,
    cancellation_reason         TEXT,

    created_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_destination_requests_partner
    ON destination_requests(partner_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_destination_requests_status
    ON destination_requests(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_destination_requests_assigned_cp
    ON destination_requests(assigned_cp_id, status);

CREATE INDEX IF NOT EXISTS idx_destination_requests_destination
    ON destination_requests(destination_id);

CREATE TABLE IF NOT EXISTS destination_request_histories (
    id              BIGSERIAL PRIMARY KEY,
    request_id      BIGINT NOT NULL REFERENCES destination_requests(id) ON DELETE CASCADE,
    actor_id        BIGINT REFERENCES users(id),
    action          VARCHAR(50) NOT NULL,
    from_status     VARCHAR(35),
    to_status       VARCHAR(35) NOT NULL,
    note            TEXT,
    reason          TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_destination_request_histories_request
    ON destination_request_histories(request_id, created_at ASC);
