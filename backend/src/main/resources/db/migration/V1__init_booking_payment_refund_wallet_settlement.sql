-- =====================================================================================
--  V1 — Booking / Payment / Refund / Partner Revenue / Wallet & Settlement
-- =====================================================================================
--  Migration AN TOÀN & IDEMPOTENT:
--   * Dùng CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS / ADD COLUMN IF NOT EXISTS.
--   * Có thể chạy trên DB đã có bảng do Hibernate `ddl-auto=update` tạo trước đó.
--   * Không DROP / TRUNCATE bất kỳ dữ liệu nào.
--
--  Lưu ý: `spring.jpa.hibernate.ddl-auto=update` vẫn được bật cho các bảng cũ của dự án.
--  Migration này đảm bảo các bảng nghiệp vụ mới có đầy đủ ràng buộc, index và
--  UNIQUE constraint cần thiết cho tính toàn vẹn dữ liệu (chống duplicate payment,
--  refund trùng, settlement trùng, cập nhật số dư hai lần).
-- =====================================================================================

-- ── 1. Role PARTNER ────────────────────────────────────────────────────────────
-- LƯU Ý: Flyway chạy TRƯỚC Hibernate `ddl-auto=update`, nên trên DB mới bảng `roles`
-- có thể chưa tồn tại. Bọc trong DO block + kiểm tra to_regclass để migration
-- không fail. Role PARTNER thật sự được tạo bởi DataInitializer (Java).
DO $$
BEGIN
    IF to_regclass('roles') IS NOT NULL THEN
        INSERT INTO roles (name, description, is_system, created_at, updated_at)
        SELECT 'PARTNER', 'Đối tác hưởng doanh thu và sở hữu ví nội bộ', true, NOW(), NOW()
        WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'PARTNER');
    END IF;
END $$;

-- ── 2. Partners ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partners (
    id                              BIGSERIAL PRIMARY KEY,
    user_id                         BIGINT       NOT NULL,
    partner_name                    VARCHAR(150) NOT NULL,
    commission_rate                 NUMERIC(5,4) NOT NULL DEFAULT 0.2000,
    destination_commission_override TEXT,
    active                          BOOLEAN      NOT NULL DEFAULT TRUE,
    created_at                      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at                      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_partner_user UNIQUE (user_id)
);
CREATE INDEX IF NOT EXISTS idx_partners_user ON partners (user_id);

-- ── 3. Wallets (1-to-1 với Partner) ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallets (
    id         BIGSERIAL PRIMARY KEY,
    partner_id BIGINT         NOT NULL,
    balance    NUMERIC(16, 2) NOT NULL DEFAULT 0,
    currency   VARCHAR(3)     NOT NULL DEFAULT 'VND',
    created_at TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_wallet_partner UNIQUE (partner_id)
);

-- ── 4. Bookings ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id                  BIGSERIAL PRIMARY KEY,
    booking_code        VARCHAR(32)  NOT NULL,
    tourist_id          BIGINT       NOT NULL,
    tour_id             BIGINT       NOT NULL,
    experience_date     DATE         NOT NULL,
    total_amount        NUMERIC(14, 2) NOT NULL,
    currency            VARCHAR(3)   NOT NULL DEFAULT 'VND',
    status              VARCHAR(30)  NOT NULL DEFAULT 'PENDING_PAYMENT',
    created_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    payment_deadline    TIMESTAMPTZ  NOT NULL,
    paid_at             TIMESTAMPTZ,
    confirmed_at        TIMESTAMPTZ,
    completed_at        TIMESTAMPTZ,
    cancellation_reason TEXT,
    updated_at          TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_booking_code UNIQUE (booking_code)
);
CREATE INDEX IF NOT EXISTS idx_bookings_tourist ON bookings (tourist_id);
CREATE INDEX IF NOT EXISTS idx_bookings_tour ON bookings (tour_id);
CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings (status);
CREATE INDEX IF NOT EXISTS idx_bookings_deadline ON bookings (payment_deadline);

-- ── 5. Booking slot holds ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_slot_holds (
    id                 BIGSERIAL PRIMARY KEY,
    booking_id         BIGINT      NOT NULL,
    experience_slot_id BIGINT      NOT NULL,
    slot_type          VARCHAR(30) NOT NULL DEFAULT 'EXPERIENCE',
    slot_date          DATE        NOT NULL,
    experience_id      BIGINT      NOT NULL,
    released           BOOLEAN     NOT NULL DEFAULT FALSE,
    held_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    released_at        TIMESTAMPTZ,
    CONSTRAINT uk_booking_slot_hold UNIQUE (booking_id, experience_slot_id)
);
CREATE INDEX IF NOT EXISTS idx_slot_holds_booking ON booking_slot_holds (booking_id);
CREATE INDEX IF NOT EXISTS idx_slot_holds_slot ON booking_slot_holds (experience_slot_id);

-- ── 6. Payments ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS payments (
    id                   BIGSERIAL PRIMARY KEY,
    booking_id           BIGINT         NOT NULL,
    txn_ref              VARCHAR(100)   NOT NULL,
    vnp_transaction_no   VARCHAR(20),
    vnp_bank_tran_no     VARCHAR(255),
    bank_code            VARCHAR(20),
    card_type            VARCHAR(20),
    method               VARCHAR(20)    NOT NULL DEFAULT 'VNPAY',
    status               VARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    amount               NUMERIC(14, 2) NOT NULL,
    currency             VARCHAR(3)     NOT NULL DEFAULT 'VND',
    created_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    expires_at           TIMESTAMPTZ    NOT NULL,
    paid_at              TIMESTAMPTZ,
    resolved_at          TIMESTAMPTZ,
    vnp_response_code    VARCHAR(10),
    vnp_transaction_status VARCHAR(10),
    vnp_message          VARCHAR(255),
    payment_url          TEXT,
    duplicate_payment    BOOLEAN        NOT NULL DEFAULT FALSE,
    ipn_count            INTEGER        NOT NULL DEFAULT 0,
    query_count          INTEGER        NOT NULL DEFAULT 0,
    note                 TEXT,
    updated_at           TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_payment_txn_ref UNIQUE (txn_ref),
    CONSTRAINT uk_payment_vnp_transaction_no UNIQUE (vnp_transaction_no)
);
CREATE INDEX IF NOT EXISTS idx_payments_booking ON payments (booking_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);
CREATE INDEX IF NOT EXISTS idx_payments_method ON payments (method);

-- ── 7. Refund requests ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refund_requests (
    id                    BIGSERIAL PRIMARY KEY,
    refund_code           VARCHAR(32)   NOT NULL,
    payment_id            BIGINT        NOT NULL,
    tourist_id            BIGINT        NOT NULL,
    status                VARCHAR(30)   NOT NULL DEFAULT 'PENDING_REVIEW',
    declared_reason       VARCHAR(30),
    approved_reason       VARCHAR(30),
    reason_detail         TEXT,
    evidence              TEXT,
    proposed_amount       NUMERIC(14, 2) NOT NULL,
    approved_amount       NUMERIC(14, 2),
    refunded_amount       NUMERIC(14, 2),
    currency              VARCHAR(3)    NOT NULL DEFAULT 'VND',
    method                VARCHAR(30),
    reviewed_by           BIGINT,
    reviewed_at           TIMESTAMPTZ,
    rejection_reason      TEXT,
    vnp_request_id        VARCHAR(32),
    vnp_txn_ref           VARCHAR(100),
    vnp_transaction_no    VARCHAR(20),
    vnp_response_code     VARCHAR(10),
    vnp_transaction_status VARCHAR(10),
    vnp_message           VARCHAR(255),
    vnp_raw_response      TEXT,
    vnp_requested_at      TIMESTAMPTZ,
    vnp_resolved_at       TIMESTAMPTZ,
    bank_account_number   VARCHAR(50),
    bank_account_name     VARCHAR(150),
    bank_name             VARCHAR(150),
    transfer_reference    VARCHAR(100),
    transfer_evidence     TEXT,
    transferred_at        TIMESTAMPTZ,
    created_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_refund_code UNIQUE (refund_code)
);
CREATE INDEX IF NOT EXISTS idx_refund_payment ON refund_requests (payment_id);
CREATE INDEX IF NOT EXISTS idx_refund_status ON refund_requests (status);
CREATE INDEX IF NOT EXISTS idx_refund_tourist ON refund_requests (tourist_id);

-- ── 8. Refund audit log (append-only) ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS refund_audit_logs (
    id                BIGSERIAL PRIMARY KEY,
    refund_request_id BIGINT        NOT NULL,
    action            VARCHAR(40)   NOT NULL,
    from_status       VARCHAR(30),
    to_status         VARCHAR(30),
    performed_by      BIGINT,
    amount            NUMERIC(14, 2),
    reference         VARCHAR(100),
    detail            TEXT,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refund_audit_refund ON refund_audit_logs (refund_request_id);
CREATE INDEX IF NOT EXISTS idx_refund_audit_action ON refund_audit_logs (action);

-- ── 9. Partner revenues ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS partner_revenues (
    id                BIGSERIAL PRIMARY KEY,
    partner_id        BIGINT         NOT NULL,
    booking_id        BIGINT         NOT NULL,
    payment_id        BIGINT         NOT NULL,
    revenue_period    VARCHAR(7)    NOT NULL,
    completed_date    DATE,
    gross_amount      NUMERIC(14, 2) NOT NULL,
    refund_amount     NUMERIC(14, 2) NOT NULL DEFAULT 0,
    commission_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    commission_rate   NUMERIC(5, 4)  NOT NULL DEFAULT 0,
    adjustment_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    partner_net_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    status            VARCHAR(30)    NOT NULL DEFAULT 'PENDING',
    deferred_reason   VARCHAR(40),
    settlement_id     BIGINT,
    eligible_at       TIMESTAMPTZ,
    settled_at        TIMESTAMPTZ,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    -- Mỗi Partner tối đa MỘT bản ghi doanh thu cho mỗi Booking / Payment
    -- (booking có thể gồm nhiều Experience của các Partner khác nhau).
    CONSTRAINT uk_partner_revenue_booking_partner UNIQUE (booking_id, partner_id),
    CONSTRAINT uk_partner_revenue_payment_partner UNIQUE (payment_id, partner_id)
);
CREATE INDEX IF NOT EXISTS idx_revenue_partner ON partner_revenues (partner_id);
CREATE INDEX IF NOT EXISTS idx_revenue_status ON partner_revenues (status);
CREATE INDEX IF NOT EXISTS idx_revenue_period ON partner_revenues (revenue_period);
CREATE INDEX IF NOT EXISTS idx_revenue_settlement ON partner_revenues (settlement_id);

-- ── 10. Settlements ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settlements (
    id                BIGSERIAL PRIMARY KEY,
    settlement_code   VARCHAR(32)   NOT NULL,
    partner_id        BIGINT        NOT NULL,
    revenue_period    VARCHAR(7)    NOT NULL,
    period_start      DATE          NOT NULL,
    period_end        DATE          NOT NULL,
    gross_amount      NUMERIC(16, 2) NOT NULL DEFAULT 0,
    refund_amount     NUMERIC(16, 2) NOT NULL DEFAULT 0,
    commission_amount NUMERIC(16, 2) NOT NULL DEFAULT 0,
    adjustment_amount NUMERIC(16, 2) NOT NULL DEFAULT 0,
    settlement_amount NUMERIC(16, 2) NOT NULL DEFAULT 0,
    status            VARCHAR(20)   NOT NULL DEFAULT 'DRAFT',
    created_by        BIGINT,
    approved_by       BIGINT,
    created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    approved_at       TIMESTAMPTZ,
    rejection_reason  TEXT,
    note              TEXT,
    updated_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_settlement_code UNIQUE (settlement_code),
    CONSTRAINT uk_settlement_partner_period UNIQUE (partner_id, revenue_period)
);
CREATE INDEX IF NOT EXISTS idx_settlement_partner ON settlements (partner_id);
CREATE INDEX IF NOT EXISTS idx_settlement_status ON settlements (status);
CREATE INDEX IF NOT EXISTS idx_settlement_period ON settlements (revenue_period);

-- ── 11. Settlement details ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS settlement_details (
    id                BIGSERIAL PRIMARY KEY,
    settlement_id     BIGINT         NOT NULL,
    partner_revenue_id BIGINT        NOT NULL,
    revenue_period    VARCHAR(7)    NOT NULL,
    gross_amount      NUMERIC(14, 2) NOT NULL,
    refund_amount     NUMERIC(14, 2) NOT NULL DEFAULT 0,
    commission_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    adjustment_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    partner_net_amount NUMERIC(14, 2) NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    CONSTRAINT uk_settlement_detail_revenue UNIQUE (settlement_id, partner_revenue_id)
);
CREATE INDEX IF NOT EXISTS idx_settlement_detail_settlement ON settlement_details (settlement_id);
CREATE INDEX IF NOT EXISTS idx_settlement_detail_revenue ON settlement_details (partner_revenue_id);

-- ── 12. Wallet transactions ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS wallet_transactions (
    id              BIGSERIAL PRIMARY KEY,
    wallet_id       BIGINT         NOT NULL,
    transaction_type VARCHAR(40)   NOT NULL,
    direction       VARCHAR(10)   NOT NULL,
    amount          NUMERIC(16, 2) NOT NULL,
    balance_before  NUMERIC(16, 2) NOT NULL,
    balance_after   NUMERIC(16, 2) NOT NULL,
    source_type     VARCHAR(40)   NOT NULL,
    source_id       BIGINT         NOT NULL,
    status          VARCHAR(20)   NOT NULL DEFAULT 'SUCCESS',
    created_by      BIGINT,
    note            TEXT,
    created_at      TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    -- Chống cập nhật số dư hai lần: mỗi (wallet, source) chỉ có 1 giao dịch.
    CONSTRAINT uk_wallet_txn_settlement_credit UNIQUE (wallet_id, source_type, source_id)
);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_wallet ON wallet_transactions (wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_source ON wallet_transactions (source_type, source_id);
CREATE INDEX IF NOT EXISTS idx_wallet_txn_created ON wallet_transactions (created_at);

-- ── 13. Financial adjustments ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS financial_adjustments (
    id                  BIGSERIAL PRIMARY KEY,
    partner_id          BIGINT         NOT NULL,
    refund_request_id   BIGINT,
    source_settlement_id BIGINT,
    amount              NUMERIC(16, 2) NOT NULL,
    currency            VARCHAR(3)     NOT NULL DEFAULT 'VND',
    reason              TEXT           NOT NULL,
    status              VARCHAR(20)    NOT NULL DEFAULT 'PENDING',
    created_by          BIGINT,
    approved_by         BIGINT,
    approved_at         TIMESTAMPTZ,
    created_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW(),
    updated_at          TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_fin_adj_partner ON financial_adjustments (partner_id);
CREATE INDEX IF NOT EXISTS idx_fin_adj_status ON financial_adjustments (status);
CREATE INDEX IF NOT EXISTS idx_fin_adj_refund ON financial_adjustments (refund_request_id);
