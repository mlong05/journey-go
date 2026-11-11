-- =====================================================================================
--  V15 -- "Dat tour nhom" (Booking Passenger / Invitation / Change Request / Chat)
-- =====================================================================================
--  Muc dich:
--   1. booking_passengers            -- Danh sach hanh khach trong mot Booking (dat cho ca nhom).
--   2. booking_passenger_invitations -- Loi moi tham gia tour (token hash, han 24 gio).
--   3. booking_passenger_changes     -- Lich su thay doi hanh khach (luu truoc / sau).
--   4. booking_messages              -- Chat ho tro giua khach dat va doi tac.
--
--  AN TOAN & IDEMPOTENT:
--   -- CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
--   -- Khong tao FK toi `users` (bang `users` co the chua ton tai luc Flyway chay tren DB moi).
-- =====================================================================================

-- ── 1. booking_passengers ─────────────────────────────────────────────────────
--  Mot Booking co the dat cho nhieu nguoi. Nguoi dat (Booking Customer) cung la mot
--  Passenger nhung co `is_booking_customer = true`.
--  - guest_type        : ADULT | CHILD | TODDLER | INFANT -- xac dinh theo TUOI TAI NGAY TRAI NGHIEM.
--  - counts_toward_slot: co che do slot (em be thuong khong chiem slot) -- copy tu TourPrice cua doi tac.
--  - linked_user_id    : User JourneyGo da lien ket (sau khi xac nhan loi moi). NULL = chua co tai khoan.
CREATE TABLE IF NOT EXISTS booking_passengers (
    id                  BIGSERIAL PRIMARY KEY,
    booking_id          BIGINT       NOT NULL,
    full_name           VARCHAR(200) NOT NULL,
    birth_date          DATE,
    gender              VARCHAR(20),
    email               VARCHAR(255),
    guest_type          VARCHAR(20)  NOT NULL DEFAULT 'ADULT',
    price               NUMERIC(12, 2) NOT NULL DEFAULT 0,
    counts_toward_slot  BOOLEAN      NOT NULL DEFAULT TRUE,
    is_booking_customer BOOLEAN      NOT NULL DEFAULT FALSE,
    linked_user_id      BIGINT,
    status              VARCHAR(20)  NOT NULL DEFAULT 'ACTIVE',
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_booking_passenger_guest_type
        CHECK (guest_type IN ('ADULT', 'CHILD', 'TODDLER', 'INFANT')),
    CONSTRAINT ck_booking_passenger_status
        CHECK (status IN ('ACTIVE', 'REPLACED', 'REVOKED')),
    CONSTRAINT ck_booking_passenger_customer
        CHECK (NOT is_booking_customer OR linked_user_id IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_booking_passengers_booking
    ON booking_passengers (booking_id, created_at);
CREATE INDEX IF NOT EXISTS idx_booking_passengers_linked_user
    ON booking_passengers (linked_user_id);

-- ── 2. booking_passenger_invitations ──────────────────────────────────────────
--  Loi moi tham gia tour. Token duoc luu duoi dang HASH (SHA-256) -- khong luu ban ro.
--  Han 24 gio ke tu luc tao (quy tac nghiep vu).
CREATE TABLE IF NOT EXISTS booking_passenger_invitations (
    id                   BIGSERIAL PRIMARY KEY,
    booking_id           BIGINT       NOT NULL,
    booking_passenger_id BIGINT       NOT NULL,
    invited_by           BIGINT       NOT NULL,
    invited_email        VARCHAR(255) NOT NULL,
    invitation_token_hash VARCHAR(64) NOT NULL,
    status               VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    expires_at           TIMESTAMPTZ  NOT NULL,
    accepted_at          TIMESTAMPTZ,
    accepted_user_id     BIGINT,
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_booking_passenger_invitation_hash
        UNIQUE (invitation_token_hash),
    CONSTRAINT ck_booking_passenger_invitation_status
        CHECK (status IN ('PENDING', 'ACCEPTED', 'EXPIRED', 'REVOKED'))
);

CREATE INDEX IF NOT EXISTS idx_booking_passenger_invitations_booking
    ON booking_passenger_invitations (booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_passenger_invitations_passenger
    ON booking_passenger_invitations (booking_passenger_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_booking_passenger_invitations_status
    ON booking_passenger_invitations (status, expires_at);

-- ── 3. booking_passenger_changes ─────────────────────────────────────────────
--  Lich su thay doi hanh khach (E -> F). Luu day du du lieu TRUOC va SAU khi thay doi.
CREATE TABLE IF NOT EXISTS booking_passenger_changes (
    id                   BIGSERIAL PRIMARY KEY,
    booking_id           BIGINT       NOT NULL,
    passenger_id         BIGINT       NOT NULL,
    requested_by         BIGINT,
    processed_by         BIGINT,
    old_data             TEXT,
    new_data             TEXT,
    price_delta          NUMERIC(12, 2) NOT NULL DEFAULT 0,
    reason               TEXT,
    status               VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    created_at           TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    processed_at         TIMESTAMPTZ,
    CONSTRAINT ck_booking_passenger_change_status
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

CREATE INDEX IF NOT EXISTS idx_booking_passenger_changes_booking
    ON booking_passenger_changes (booking_id, created_at DESC);

-- ── 4. booking_messages ───────────────────────────────────────────────────────
--  Chat ho tro giua khach dat (Booking Customer / Passenger) va doi tac so hu tour.
CREATE TABLE IF NOT EXISTS booking_messages (
    id           BIGSERIAL PRIMARY KEY,
    booking_id   BIGINT      NOT NULL,
    sender_id    BIGINT      NOT NULL,
    body         TEXT        NOT NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    read_at      TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_booking_messages_booking
    ON booking_messages (booking_id, created_at);

-- ── 5. bookings: bo sung cot nghiep vu moi ────────────────────────────────────
--  slot_count  : so slot da giu cho Booking (bang so hanh khach co counts_toward_slot = TRUE).
--  reminder_sent_at: thoi diem da gui nhac nhở "sap den ngay trai nghiem" (de khong gui trung).
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS slot_count INTEGER NOT NULL DEFAULT 1;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMPTZ;

-- ── 5b. booking_slot_holds: hỗ trợ giữ slot của TOUR (không phải Experience) ──
--  experience_slot_id trở thành NULLABLE vì hold của TOUR không có Experience.
--  slot_count: số slot đã giữ (booking nhóm giữ N slot cùng lúc).
ALTER TABLE booking_slot_holds ALTER COLUMN experience_slot_id DROP NOT NULL;
ALTER TABLE booking_slot_holds ALTER COLUMN experience_id DROP NOT NULL;
ALTER TABLE booking_slot_holds ADD COLUMN IF NOT EXISTS tour_slot_id BIGINT;
ALTER TABLE booking_slot_holds ADD COLUMN IF NOT EXISTS slot_count INTEGER NOT NULL DEFAULT 1;

CREATE INDEX IF NOT EXISTS idx_slot_holds_tour_slot ON booking_slot_holds (tour_slot_id);

-- ── 6. tour_slots: dung lai cho Booking nhom ─────────────────────────────────
--  tour_slots da ton tai (V7) nhung chua duoc dung khi dat tour. Bay gio moi dung
--  `booked_count` de lam so cho da dat, va them `max_guests_per_slot` de phan biet
--  so cho toi da (gia tri cua tour) voi so hanh khach dang cho (gia tri ban dat).
ALTER TABLE tour_slots ADD COLUMN IF NOT EXISTS max_guests_per_slot INTEGER;

-- =====================================================================================
--  Het V15.
-- =====================================================================================
