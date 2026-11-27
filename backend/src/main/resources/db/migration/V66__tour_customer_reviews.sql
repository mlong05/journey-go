-- ═══════════════════════════════════════════════════════════════════════════════
-- V66 — Verified Tour Reviews (tour_customer_reviews)
--
-- Lưu đánh giá xác thực từ du khách sau khi hoàn thành chuyến đi
-- (chủ booking hoặc hành khách ACTIVE đã liên kết tài khoản, không bị hoàn tiền).
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS tour_customer_reviews (
    id                  BIGSERIAL PRIMARY KEY,
    booking_id          BIGINT NOT NULL REFERENCES bookings(id),
    tour_id             BIGINT NOT NULL REFERENCES tours(tour_id),
    reviewer_id         BIGINT NOT NULL REFERENCES users(id),
    overall_rating      INT NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
    guide_rating        INT CHECK (guide_rating BETWEEN 1 AND 5),
    culture_rating      INT CHECK (culture_rating BETWEEN 1 AND 5),
    schedule_rating     INT CHECK (schedule_rating BETWEEN 1 AND 5),
    value_rating        INT CHECK (value_rating BETWEEN 1 AND 5),
    title               VARCHAR(150),
    comment             TEXT NOT NULL,
    verified_purchase   BOOLEAN NOT NULL DEFAULT TRUE,
    experience_date     DATE NOT NULL,
    provider_reply      TEXT,
    provider_replied_by BIGINT REFERENCES users(id),
    provider_replied_at TIMESTAMPTZ,
    is_hidden           BOOLEAN NOT NULL DEFAULT FALSE,
    hidden_reason       VARCHAR(500),
    hidden_by           BIGINT REFERENCES users(id),
    hidden_at           TIMESTAMPTZ,
    edited_at           TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_tour_customer_reviews_booking_reviewer UNIQUE (booking_id, reviewer_id)
);

CREATE TABLE IF NOT EXISTS tour_customer_review_images (
    review_id   BIGINT NOT NULL REFERENCES tour_customer_reviews(id) ON DELETE CASCADE,
    order_index INT NOT NULL DEFAULT 0,
    image_url   VARCHAR(1000) NOT NULL,
    PRIMARY KEY (review_id, order_index)
);

CREATE INDEX IF NOT EXISTS idx_tcr_tour_visible
    ON tour_customer_reviews (tour_id, is_hidden, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tcr_tour_rating
    ON tour_customer_reviews (tour_id, overall_rating)
    WHERE is_hidden = FALSE;

CREATE INDEX IF NOT EXISTS idx_tcr_reviewer
    ON tour_customer_reviews (reviewer_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_tcr_booking
    ON tour_customer_reviews (booking_id);
