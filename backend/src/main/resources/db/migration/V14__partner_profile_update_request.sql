-- =====================================================================================
--  V14 — Luồng "Yêu cầu đổi thông tin đối tác" (Partner Profile Update Request)
-- =====================================================================================
--  Nội dung:
--   1. partner_profile_update_requests      — yêu cầu đổi thông tin của đối tác
--   2. partner_profile_update_histories     — lịch sử thay đổi (ai, lúc nào, trước → sau, lý do)
--
--  AN TOÀN & IDEMPOTENT:
--   • CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
--   • Bảng `users` có thể chưa tồn tại lúc Flyway chạy trên DB mới ⇒ KHÔNG dùng FK tham chiếu
--     `users`, dùng BIGINT + index thay thế (đồng lý với V6).
-- =====================================================================================

-- ── 1. partner_profile_update_requests ────────────────────────────────────────
--  Mỗi lần đối tác bấm "Yêu cầu chỉnh sửa thông tin" ⇒ tạo 1 bản ghi.
--  • old_data / new_data: JSON object {"fieldKey": "value"} — snapshot thông tin cũ và mới.
--  • changed_fields     : JSON array ["fieldKey", ...] — các trường đối tác thực sự sửa.
CREATE TABLE IF NOT EXISTS partner_profile_update_requests (
    id                BIGSERIAL PRIMARY KEY,

    partner_user_id   BIGINT       NOT NULL,   -- Đối tác gửi yêu cầu
    application_id    BIGINT,                   -- Đơn đăng ký gốc (nguồn của hồ sơ chính thức)
    provider_profile_id BIGINT,                 -- Hồ sơ đối tác (provider_profiles)

    status            VARCHAR(20)  NOT NULL DEFAULT 'PENDING',
    old_data          TEXT,                     -- JSON: thông tin hiện tại (trước khi sửa)
    new_data          TEXT,                     -- JSON: thông tin đề xuất mới
    changed_fields    TEXT,                     -- JSON: danh sách trường thay đổi

    reason            TEXT,                     -- Lý do từ chối (bắt buộc khi REJECTED)
    partner_note      TEXT,                     -- Ghi chú của đối tác kèm theo yêu cầu
    admin_note        TEXT,                     -- Ghi chú của Admin khi xử lý

    reviewer_id       BIGINT,                   -- Admin xử lý
    submitted_at      TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    reviewed_at       TIMESTAMPTZ,

    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),

    CONSTRAINT ck_partner_profile_update_status
        CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED'))
);

CREATE INDEX IF NOT EXISTS idx_partner_profile_update_requests_partner
    ON partner_profile_update_requests (partner_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_profile_update_requests_status
    ON partner_profile_update_requests (status, submitted_at DESC);

-- ── 2. partner_profile_update_histories ───────────────────────────────────────
--  Lịch sử thay đổi: đối tác gửi yêu cầu, Admin duyệt / từ chối.
CREATE TABLE IF NOT EXISTS partner_profile_update_histories (
    id                BIGSERIAL PRIMARY KEY,
    request_id        BIGINT       NOT NULL,
    actor_id          BIGINT,                    -- Người thực hiện (đối tác hoặc Admin)
    action            VARCHAR(20)  NOT NULL,     -- SUBMITTED | APPROVED | REJECTED
    status_before     VARCHAR(20),
    status_after      VARCHAR(20),
    reason            TEXT,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_partner_profile_update_history_action
        CHECK (action IN ('SUBMITTED', 'APPROVED', 'REJECTED'))
);

CREATE INDEX IF NOT EXISTS idx_partner_profile_update_histories_request
    ON partner_profile_update_histories (request_id, created_at DESC);

-- =====================================================================================
--  Hết V14.
-- =====================================================================================
