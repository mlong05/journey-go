-- Bước 1 — Lịch trình theo ngày (dạng chữ, không gắn với điểm đến). Ngày thứ n = position + 1.
CREATE TABLE IF NOT EXISTS tour_itinerary_days (
    tour_id       BIGINT       NOT NULL REFERENCES tours(tour_id) ON DELETE CASCADE,
    position      INTEGER      NOT NULL,
    title         VARCHAR(200),
    main_activity VARCHAR(500),
    content       TEXT,
    PRIMARY KEY (tour_id, position)
);
