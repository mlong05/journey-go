-- =====================================================================================
--  V6 — Luồng "Đăng ký đối tác" (Partner Application) + "Quản lý chính sách hoa hồng"
--       (Commission Policy) — theo đặc tả Final1_DOITAC.pdf
-- =====================================================================================
--  Nội dung:
--   1. partner_applications      — đơn đăng ký trở thành đối tác (4 giai đoạn)
--   2. partner_application_histories — lịch sử kiểm duyệt (admin, thời gian, trạng thái trước/sau, lý do)
--   3. partner_application_otps  — OTP xác minh email (6 số, 5 phút, 3 lần/ngày, 5 lần sai)
--   4. commission_policies        — chính sách hoa hồng mặc định theo hiệu lực (BR-01..BR-09)
--
--  AN TOÀN & IDEMPOTENT:
--   • CREATE TABLE IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
--   • Bảng `users` có thể chưa tồn tại lúc Flyway chạy trên DB mới (Flyway chạy TRƯỚC
--     Hibernate `ddl-auto=update`) ⇒ KHÔNG dùng ràng buộc FK tham chiếu `users`,
--     dùng BIGINT + index thay thế. Cùng lý do với `provider_profiles`.
-- =====================================================================================


-- ── 1. partner_applications ────────────────────────────────────────────────────
--  Lưu toàn bộ nội dung đơn đăng ký trở thành đối tác.
--  Mỗi cột nghiệp vụ đều NOT NULL bắt buộc khi SUBMITTED — dữ liệu nháp có thể null
--  (draft lưu dần), validation thực thi lúc gửi đơn (đặc tả mục "Kiểm tra dữ liệu trước khi gửi đơn").
CREATE TABLE IF NOT EXISTS partner_applications (
    id                          BIGSERIAL PRIMARY KEY,

    -- ── Giai đoạn 1: Thông tin người đại diện ─────────────────────────────────
    email                       VARCHAR(100) NOT NULL,
    email_verified              BOOLEAN      NOT NULL DEFAULT FALSE,
    phone                       VARCHAR(20),
    representative_name         VARCHAR(150),
    representative_position    VARCHAR(50),

    -- ── Giai đoạn 2: Xác minh hồ sơ doanh nghiệp ─────────────────────────────
    business_name               VARCHAR(200),
    partner_type                VARCHAR(30),   -- TRAVEL_AGENCY | EXPERIENCE_PROVIDER
    travel_scope                VARCHAR(20),   -- INTERNATIONAL | DOMESTIC (chỉ TRAVEL_AGENCY)
    tax_code                    VARCHAR(20),
    business_registration_info  TEXT,
    operation_license_url       TEXT,          -- Giấy phép hoạt động (bắt buộc với cả 2 loại)
    travel_license_url          TEXT,          -- Giấy phép lữ hành (chỉ TRAVEL_AGENCY)
    signature_document_url      TEXT,          -- Giấy ký quỹ (chỉ TRAVEL_AGENCY)
    business_registration_url   TEXT,          -- Giấy ĐK kinh doanh / GPKD / Hộ kinh doanh
    province                    VARCHAR(100),
    district                    VARCHAR(100),
    ward                        VARCHAR(100),
    address_detail              TEXT,
    business_scope              TEXT,

    -- ── Giai đoạn 3: Thiết lập thanh toán ─────────────────────────────────────
    bank_name                   VARCHAR(120),
    bank_account_number         VARCHAR(50),
    bank_account_holder         VARCHAR(150),

    -- ── Giai đoạn 4: Xác nhận & đồng ý ────────────────────────────────────────
    confirmed_authority         BOOLEAN      NOT NULL DEFAULT FALSE,
    agreed_partner_terms        BOOLEAN      NOT NULL DEFAULT FALSE,
    agreed_privacy_policy       BOOLEAN      NOT NULL DEFAULT FALSE,

    -- ── Vòng đời đơn ───────────────────────────────────────────────────────────
    status                      VARCHAR(20)  NOT NULL DEFAULT 'DRAFT',
    applicant_user_id           BIGINT,       -- User đã đăng nhập (có thể null khi mới tạo đơn)
    reviewer_id                 BIGINT,       -- Admin xử lý gần nhất
    rejection_reason            TEXT,         -- Lý do từ chối (bắt buộc khi REJECTED)
    review_note                 TEXT,         -- Ghi chú của Admin
    submitted_at                TIMESTAMPTZ,
    reviewed_at                 TIMESTAMPTZ,

    created_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_partner_application_status
        CHECK (status IN ('DRAFT', 'PENDING', 'APPROVED', 'REJECTED')),
    CONSTRAINT ck_partner_application_type
        CHECK (partner_type IS NULL OR partner_type IN ('TRAVEL_AGENCY', 'EXPERIENCE_PROVIDER')),
    CONSTRAINT ck_partner_application_scope
        CHECK (travel_scope IS NULL OR travel_scope IN ('INTERNATIONAL', 'DOMESTIC'))
);

CREATE INDEX IF NOT EXISTS idx_partner_applications_email ON partner_applications (email);
CREATE INDEX IF NOT EXISTS idx_partner_applications_status ON partner_applications (status, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_applications_applicant ON partner_applications (applicant_user_id);
CREATE INDEX IF NOT EXISTS idx_partner_applications_business ON partner_applications (business_name);

-- ── 2. partner_application_histories ──────────────────────────────────────────
--  Mỗi lần Admin duyệt / từ chối / yêu cầu bổ sung đều ghi 1 dòng.
CREATE TABLE IF NOT EXISTS partner_application_histories (
    id                BIGSERIAL PRIMARY KEY,
    application_id    BIGINT       NOT NULL,
    actor_id          BIGINT,                    -- Admin thực hiện
    action            VARCHAR(20)  NOT NULL,     -- SUBMITTED | APPROVED | REJECTED | RESUBMITTED
    status_before     VARCHAR(20),
    status_after      VARCHAR(20),
    reason            TEXT,                      -- Lý do từ chối / ghi chú
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_partner_app_history_action
        CHECK (action IN ('SUBMITTED', 'APPROVED', 'REJECTED', 'RESUBMITTED'))
);

CREATE INDEX IF NOT EXISTS idx_partner_app_histories_app ON partner_application_histories (application_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_partner_app_histories_actor ON partner_application_histories (actor_id);

-- ── 3. partner_application_otps ────────────────────────────────────────────────
--  OTP xác minh email khi đăng ký trở thành đối tác:
--    • mã 6 chữ số, hạn 5 phút
--    • tối đa 3 lần gửi / email / ngày
--    • tối đa 5 lần nhập sai
--    • gửi mã mới ⇒ mã cũ mất hiệu lực
CREATE TABLE IF NOT EXISTS partner_application_otps (
    id                BIGSERIAL PRIMARY KEY,
    email             VARCHAR(100) NOT NULL,
    otp               VARCHAR(10)  NOT NULL,
    expiry_date       TIMESTAMPTZ  NOT NULL,
    used              BOOLEAN      NOT NULL DEFAULT FALSE,
    attempt_count     INTEGER      NOT NULL DEFAULT 0,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_app_otps_email ON partner_application_otps (email, created_at DESC);

-- ── 4. commission_policies ────────────────────────────────────────────────────
--  Chính sách hoa hồng mặc định toàn nền tảng.
--    • BR-01: chỉ ADMIN quản lý  (kiểm ở tầng service/controller)
--    • BR-02: 0% < rate < 100%  (CHECK constraint)
--    • BR-03: mỗi thời điểm chỉ 1 chính sách có hiệu lực (kiểm ở tầng service)
--    • BR-04: không được chồng lấn khoảng hiệu lực (kiểm ở tầng service)
--    • BR-05: không áp dụng hồi tố — settlement dùng commission snapshot trên ProviderRevenue
--    • BR-06: mọi thay đổi có change_reason + created_by
--    • BR-07: chính sách đã có hiệu lực không sửa trực tiếp
--    • BR-08: chính sách tương lai có thể hủy/thay thế nếu chưa tới ngày hiệu lực
--    • BR-09: settlement dùng commission snapshot (không lấy tỷ lệ hiện tại)
CREATE TABLE IF NOT EXISTS commission_policies (
    id                BIGSERIAL PRIMARY KEY,
    name              VARCHAR(150) NOT NULL,
    commission_rate   NUMERIC(5,4) NOT NULL,
    effective_from    TIMESTAMPTZ  NOT NULL,
    effective_to      TIMESTAMPTZ,
    change_reason     TEXT         NOT NULL,
    created_by        BIGINT,
    cancelled         BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_commission_policy_rate
        CHECK (commission_rate > 0 AND commission_rate < 1),
    CONSTRAINT ck_commission_policy_period
        CHECK (effective_to IS NULL OR effective_to > effective_from)
);

CREATE INDEX IF NOT EXISTS idx_commission_policies_effective
    ON commission_policies (effective_from DESC, effective_to DESC);
CREATE INDEX IF NOT EXISTS idx_commission_policies_creator ON commission_policies (created_by);

-- ── 5. partner_verification_tokens ─────────────────────────────────────────────
--  Token xác nhận "email này đã được verify OTP" — sinh ra sau khi verify thành công.
--  Bắt buộc kèm theo mọi lệnh lưu nháp / gửi đơn, để không ai giả mạo được
--  trạng thái đã xác minh của một email mà mình không nhận được OTP.
--  Hết hạn sau 24 giờ.
CREATE TABLE IF NOT EXISTS partner_verification_tokens (
    id                BIGSERIAL PRIMARY KEY,
    token             VARCHAR(120) NOT NULL,
    email             VARCHAR(100) NOT NULL,
    used              BOOLEAN      NOT NULL DEFAULT FALSE,
    expiry_date       TIMESTAMPTZ  NOT NULL,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_verification_token ON partner_verification_tokens (token);
CREATE INDEX IF NOT EXISTS idx_partner_verification_email ON partner_verification_tokens (email);

-- ── 6. partner_activation_tokens ──────────────────────────────────────────────
--  Token thiết lập mật khẩu lần đầu cho tài khoản đối tác được duyệt.
--  Hết hạn sau 72 giờ; chỉ dùng được 1 lần.
CREATE TABLE IF NOT EXISTS partner_activation_tokens (
    id                BIGSERIAL PRIMARY KEY,
    token             VARCHAR(120) NOT NULL,
    user_id           BIGINT       NOT NULL,
    application_id    BIGINT,
    used              BOOLEAN      NOT NULL DEFAULT FALSE,
    expiry_date       TIMESTAMPTZ  NOT NULL,
    created_at        TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_partner_activation_token ON partner_activation_tokens (token);
CREATE INDEX IF NOT EXISTS idx_partner_activation_user ON partner_activation_tokens (user_id);

-- =====================================================================================
--  Hết V6.
-- =====================================================================================
