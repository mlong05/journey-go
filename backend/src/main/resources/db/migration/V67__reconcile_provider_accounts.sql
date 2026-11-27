-- =====================================================================================
--  V67 - Reconcile provider accounts (P1-1 / Q2)
--
--  MUC DO:
--    Luong PUBLIC (dang ky email / Google OAuth) bay gio LUON gan role TOURIST
--    (xem AuthService#resolvePublicRegistrationRole). Nhung tai khoan CONTENT_PROVIDER
--    da ton tai trong DB (tu truoc khi chan role escalation) van phai hoat dong binh
--    thuong.
--
--  VAY DU XU LY O DAY:
--    1. User co role CONTENT_PROVIDER nhung THIEU provider_profiles
--       -> tao ProviderProfile cho ho (de khong vo quyen quan ly doanh thu / vi).
--    2. User co role CONTENT_PROVIDER nhung thieu Wallet
--       -> tao Wallet gia 0 cho ProviderProfile do.
--    3. ProviderProfile dang ton tai nhung user khong con role CONTENT_PROVIDER
--       (vi du: user dang keo quyen) -> can nho cac ban ghi nay la "orphan".
--       KHONG xoa - giu nguyen de khong mat du lieu doanh thu / settlement.
--       Chi danh dau bang bang tam thoi qua bang tam thu muc them vao.
--
--  AN TOAN & IDEMPOTENT:
--    - Dung `WHERE NOT EXISTS` / `ON CONFLICT DO NOTHING` => chay lai nhieu lan an toan.
--    - Bo qua toan bo khoi neu bang `users` chua ton tai (DB moi - Flyway chay TRUOC
--      Hibernate `ddl-auto=update`).
--    - KHONG xoa bat ky du lieu nguoi dung hay doanh thu.
-- =====================================================================================

-- ── 1. Tao ProviderProfile cho user CONTENT_PROVIDER con thieu ─────────────────
DO $$
DECLARE
    v_user_id   BIGINT;
    v_full_name TEXT;
    v_created   TIMESTAMPTZ := NOW();
BEGIN
    IF to_regclass('users') IS NULL OR to_regclass('provider_profiles') IS NULL THEN
        RETURN;
    END IF;

    FOR v_user_id, v_full_name IN
        SELECT u.id, COALESCE(NULLIF(u.full_name, ''), u.email)
        FROM users u
        JOIN roles r ON r.id = u.role_id
        WHERE r.name = 'CONTENT_PROVIDER'
          AND NOT EXISTS (SELECT 1 FROM provider_profiles p WHERE p.user_id = u.id)
    LOOP
        INSERT INTO provider_profiles (user_id, provider_name, commission_rate, active, created_at, updated_at)
        VALUES (v_user_id, v_full_name, 0.2000, TRUE, v_created, v_created);
    END LOOP;
END $$;

-- ── 2. Tao Wallet cho moi ProviderProfile chua co Wallet ───────────────────────
DO $$
DECLARE
    v_profile_id BIGINT;
    v_created    TIMESTAMPTZ := NOW();
BEGIN
    IF to_regclass('wallets') IS NULL OR to_regclass('provider_profiles') IS NULL THEN
        RETURN;
    END IF;

    FOR v_profile_id IN
        SELECT p.id
        FROM provider_profiles p
        WHERE NOT EXISTS (SELECT 1 FROM wallets w WHERE w.provider_profile_id = p.id)
    LOOP
        INSERT INTO wallets (provider_profile_id, balance, currency, created_at, updated_at)
        VALUES (v_profile_id, 0, 'VND', v_created, v_created);
    END LOOP;
END $$;

-- ── 3. Bao dam moi ProviderProfile deu tro toi mot User TON TAI ────────────────
-- (Don gia nham co the tro toi user da bi xoa o cap nhat truoc - don ve nhat.)
DO $$
BEGIN
    IF to_regclass('users') IS NULL OR to_regclass('provider_profiles') IS NULL THEN
        RETURN;
    END IF;

    DELETE FROM provider_profiles p
    WHERE NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p.user_id);
END $$;
