-- =====================================================================================
--  V5 — Hợp nhất role PARTNER/PROVIDER/MODERATOR → 4 role chính thức
--       + Đổi tên schema Partner → ProviderProfile
-- =====================================================================================
--  Mô hình role chính thức sau V5 (chỉ còn 4):
--    • ADMIN             — Quản trị nền tảng
--    • CONTENT_MODERATOR — Kiểm duyệt nội dung
--    • CONTENT_PROVIDER  — Đối tác cung cấp nội dung + quản lý doanh thu / Wallet / Settlement
--    • TOURIST           — Khách du lịch
--
--  Đổi tên schema:
--    • partners                     → provider_profiles
--    • partner_revenues             → provider_revenues
--    • wallets.partner_id           → wallets.provider_profile_id
--    • settlements.partner_id       → settlements.provider_profile_id
--    • financial_adjustments.partner_id → financial_adjustments.provider_profile_id
--    • settlement_details.partner_revenue_id → settlement_details.provider_revenue_id
--    • destination_requests.partner_id     → destination_requests.requester_user_id
--
--  AN TOÀN & IDEMPOTENT:
--    • Dùng DO $$ ... $$ với kiểm tra information_schema trước khi đổi tên.
--    • Có thể chạy lại nhiều lần mà không lỗi.
--    • Không DROP dữ liệu nghiệp vụ (Wallet / Revenue / Settlement).
--
--  ⚠️ DB MỚI (không dữ liệu cũ):
--    Flyway chạy TRƯỚC Hibernate `ddl-auto=update`, nên trên DB hoàn toàn mới
--    bảng `roles` / `users` CHƯA TỒN TẠI khi V5 chạy (Hibernate mới tạo sau).
--    Vì vậy mọi thao tác lên `roles` / `users` đều phải được bọc trong điều kiện
--    `to_regclass(...) IS NOT NULL` — giống cách V1 đã làm cho bảng `roles`.
--    Khi đó việc seed 4 role được `DataInitializer` (Java) đảm nhiệm.
-- =====================================================================================


-- ── 1. Chuẩn hóa Role trong bảng `roles` ────────────────────────────────────────
--    PROVIDER  → CONTENT_PROVIDER
--    MODERATOR → CONTENT_MODERATOR
--    PARTNER   → CONTENT_PROVIDER (gộp vào cùng một role, không tạo alias)
--
--    Thứ tự: gộp PARTNER vào CONTENT_PROVIDER TRƯỚC, rồi mới đổi tên PROVIDER.
--    Nếu đổi tên trước sẽ xung đột unique(name).

-- 1.1. Gộp PARTNER → CONTENT_PROVIDER (nếu CONTENT_PROVIDER chưa tồn tại).
--      Bỏ qua toàn bộ khối nếu bảng `roles` chưa tồn tại (DB mới — Flyway chạy trước Hibernate).
DO $$
BEGIN
    IF to_regclass('roles') IS NULL THEN
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'CONTENT_PROVIDER') THEN
        UPDATE roles SET name = 'CONTENT_PROVIDER' WHERE name = 'PARTNER';
    ELSE
        -- Đã có CONTENT_PROVIDER: chuyển user của PARTNER sang role CONTENT_PROVIDER.
        IF to_regclass('users') IS NOT NULL THEN
            UPDATE users u
            SET role_id = (SELECT id FROM roles WHERE name = 'CONTENT_PROVIDER' LIMIT 1)
            WHERE u.role_id IN (SELECT id FROM roles WHERE name = 'PARTNER');
        END IF;
        DELETE FROM roles WHERE name = 'PARTNER';
    END IF;
END $$;

-- 1.2. Đổi tên PROVIDER → CONTENT_PROVIDER (chỉ khi CONTENT_PROVIDER chưa tồn tại).
DO $$
BEGIN
    IF to_regclass('roles') IS NULL THEN
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'CONTENT_PROVIDER') THEN
        UPDATE roles SET name = 'CONTENT_PROVIDER' WHERE name = 'PROVIDER';
    ELSE
        DELETE FROM roles WHERE name = 'PROVIDER';
    END IF;
END $$;

-- 1.3. Đổi tên MODERATOR → CONTENT_MODERATOR.
DO $$
BEGIN
    IF to_regclass('roles') IS NULL THEN
        RETURN;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'CONTENT_MODERATOR') THEN
        UPDATE roles SET name = 'CONTENT_MODERATOR' WHERE name = 'MODERATOR';
    ELSE
        IF to_regclass('users') IS NOT NULL THEN
            UPDATE users u
            SET role_id = (SELECT id FROM roles WHERE name = 'CONTENT_MODERATOR' LIMIT 1)
            WHERE u.role_id IN (SELECT id FROM roles WHERE name = 'MODERATOR');
        END IF;
        DELETE FROM roles WHERE name = 'MODERATOR';
    END IF;
END $$;

-- 1.4. Bảo đảm đủ 4 role chính thức tồn tại (idempotent).
--      Bỏ qua nếu bảng `roles` chưa tồn tại (DB mới) — DataInitializer sẽ seed.
DO $$
BEGIN
    IF to_regclass('roles') IS NULL THEN
        RETURN;
    END IF;

    INSERT INTO roles (name, description, is_system, created_at, updated_at)
    SELECT 'ADMIN', 'Quản trị nền tảng', true, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'ADMIN');

    INSERT INTO roles (name, description, is_system, created_at, updated_at)
    SELECT 'CONTENT_MODERATOR', 'Kiểm duyệt viên nội dung', true, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'CONTENT_MODERATOR');

    INSERT INTO roles (name, description, is_system, created_at, updated_at)
    SELECT 'CONTENT_PROVIDER', 'Đối tác cung cấp nội dung', true, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'CONTENT_PROVIDER');

    INSERT INTO roles (name, description, is_system, created_at, updated_at)
    SELECT 'TOURIST', 'Khách du lịch', true, NOW(), NOW()
    WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'TOURIST');
END $$;

-- 1.5. Xóa role cũ còn sót (PARTNER / PROVIDER / MODERATOR) — không giữ alias.
DO $$
BEGIN
    IF to_regclass('roles') IS NULL THEN
        RETURN;
    END IF;

    DELETE FROM roles WHERE name IN ('PARTNER', 'PROVIDER', 'MODERATOR');
END $$;


-- ── 2. Đổi tên bảng `partners` → `provider_profiles` ─────────────────────────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = current_schema() AND table_name = 'partners')
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables
                       WHERE table_schema = current_schema() AND table_name = 'provider_profiles') THEN
        ALTER TABLE partners RENAME TO provider_profiles;
    END IF;
END $$;

-- 2.1. Đổi tên cột `partner_name` → `provider_name` trong provider_profiles.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = current_schema() AND table_name = 'provider_profiles'
                 AND column_name = 'partner_name')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = current_schema() AND table_name = 'provider_profiles'
                         AND column_name = 'provider_name') THEN
        ALTER TABLE provider_profiles RENAME COLUMN partner_name TO provider_name;
    END IF;
END $$;

-- 2.2. Đổi tên index của bảng partners.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes
               WHERE schemaname = current_schema() AND indexname = 'idx_partners_user') THEN
        EXECUTE 'DROP INDEX IF EXISTS idx_partners_user';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                   WHERE schemaname = current_schema() AND indexname = 'idx_provider_profiles_user') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_provider_profiles_user ON provider_profiles (user_id)';
    END IF;
END $$;


-- ── 3. Đổi tên bảng `partner_revenues` → `provider_revenues` ─────────────────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema = current_schema() AND table_name = 'partner_revenues')
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables
                       WHERE table_schema = current_schema() AND table_name = 'provider_revenues') THEN
        ALTER TABLE partner_revenues RENAME TO provider_revenues;
    END IF;
END $$;

-- 3.1. Đổi tên cột `partner_id` → `provider_profile_id`.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = current_schema() AND table_name = 'provider_revenues'
                 AND column_name = 'partner_id')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = current_schema() AND table_name = 'provider_revenues'
                         AND column_name = 'provider_profile_id') THEN
        ALTER TABLE provider_revenues RENAME COLUMN partner_id TO provider_profile_id;
    END IF;
END $$;

-- 3.2. Đổi tên cột `partner_net_amount` → `provider_net_amount`.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = current_schema() AND table_name = 'provider_revenues'
                 AND column_name = 'partner_net_amount')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = current_schema() AND table_name = 'provider_revenues'
                         AND column_name = 'provider_net_amount') THEN
        ALTER TABLE provider_revenues RENAME COLUMN partner_net_amount TO provider_net_amount;
    END IF;
END $$;

-- 3.3. Đổi tên constraint UNIQUE và index của provider_revenues.
DO $$
DECLARE
    idx_name TEXT;
BEGIN
    -- uk_partner_revenue_booking_partner → uk_provider_revenue_booking_provider
    FOR idx_name IN
        SELECT con.conname FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = rel.relnamespace
        WHERE ns.nspname = current_schema() AND rel.relname = 'provider_revenues'
          AND con.conname = 'uk_partner_revenue_booking_partner'
    LOOP
        EXECUTE format('ALTER TABLE provider_revenues RENAME CONSTRAINT %I TO %I',
                       idx_name, 'uk_provider_revenue_booking_provider');
    END LOOP;

    -- uk_partner_revenue_payment_partner → uk_provider_revenue_payment_provider
    FOR idx_name IN
        SELECT con.conname FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = rel.relnamespace
        WHERE ns.nspname = current_schema() AND rel.relname = 'provider_revenues'
          AND con.conname = 'uk_partner_revenue_payment_partner'
    LOOP
        EXECUTE format('ALTER TABLE provider_revenues RENAME CONSTRAINT %I TO %I',
                       idx_name, 'uk_provider_revenue_payment_provider');
    END LOOP;

    IF EXISTS (SELECT 1 FROM pg_indexes
               WHERE schemaname = current_schema() AND indexname = 'idx_revenue_partner') THEN
        EXECUTE 'DROP INDEX IF EXISTS idx_revenue_partner';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                   WHERE schemaname = current_schema() AND indexname = 'idx_revenue_provider_profile') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_revenue_provider_profile ON provider_revenues (provider_profile_id)';
    END IF;
END $$;


-- ── 4. `wallets.partner_id` → `wallets.provider_profile_id` ──────────────────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = current_schema() AND table_name = 'wallets'
                 AND column_name = 'partner_id')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = current_schema() AND table_name = 'wallets'
                         AND column_name = 'provider_profile_id') THEN
        ALTER TABLE wallets RENAME COLUMN partner_id TO provider_profile_id;
    END IF;
END $$;

-- 4.1. Đổi tên constraint UNIQUE của wallets.
DO $$
DECLARE
    con_name TEXT;
BEGIN
    FOR con_name IN
        SELECT con.conname FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = rel.relnamespace
        WHERE ns.nspname = current_schema() AND rel.relname = 'wallets'
          AND con.conname = 'uk_wallet_partner'
    LOOP
        EXECUTE format('ALTER TABLE wallets RENAME CONSTRAINT %I TO %I',
                       con_name, 'uk_wallet_provider_profile');
    END LOOP;
END $$;


-- ── 5. `settlements.partner_id` → `settlements.provider_profile_id` ───────────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = current_schema() AND table_name = 'settlements'
                 AND column_name = 'partner_id')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = current_schema() AND table_name = 'settlements'
                         AND column_name = 'provider_profile_id') THEN
        ALTER TABLE settlements RENAME COLUMN partner_id TO provider_profile_id;
    END IF;
END $$;

DO $$
DECLARE
    con_name TEXT;
BEGIN
    FOR con_name IN
        SELECT con.conname FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = rel.relnamespace
        WHERE ns.nspname = current_schema() AND rel.relname = 'settlements'
          AND con.conname = 'uk_settlement_partner_period'
    LOOP
        EXECUTE format('ALTER TABLE settlements RENAME CONSTRAINT %I TO %I',
                       con_name, 'uk_settlement_provider_profile_period');
    END LOOP;

    IF EXISTS (SELECT 1 FROM pg_indexes
               WHERE schemaname = current_schema() AND indexname = 'idx_settlement_partner') THEN
        EXECUTE 'DROP INDEX IF EXISTS idx_settlement_partner';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                   WHERE schemaname = current_schema() AND indexname = 'idx_settlement_provider_profile') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_settlement_provider_profile ON settlements (provider_profile_id)';
    END IF;
END $$;


-- ── 6. `financial_adjustments.partner_id` → `financial_adjustments.provider_profile_id`
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = current_schema() AND table_name = 'financial_adjustments'
                 AND column_name = 'partner_id')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = current_schema() AND table_name = 'financial_adjustments'
                         AND column_name = 'provider_profile_id') THEN
        ALTER TABLE financial_adjustments RENAME COLUMN partner_id TO provider_profile_id;
    END IF;
END $$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_indexes
               WHERE schemaname = current_schema() AND indexname = 'idx_fin_adj_partner') THEN
        EXECUTE 'DROP INDEX IF EXISTS idx_fin_adj_partner';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                   WHERE schemaname = current_schema() AND indexname = 'idx_fin_adj_provider_profile') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_fin_adj_provider_profile ON financial_adjustments (provider_profile_id)';
    END IF;
END $$;


-- ── 7. `settlement_details.partner_revenue_id` → `provider_revenue_id` ───────────
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = current_schema() AND table_name = 'settlement_details'
                 AND column_name = 'partner_revenue_id')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = current_schema() AND table_name = 'settlement_details'
                         AND column_name = 'provider_revenue_id') THEN
        ALTER TABLE settlement_details RENAME COLUMN partner_revenue_id TO provider_revenue_id;
    END IF;
END $$;

DO $$
DECLARE
    con_name TEXT;
BEGIN
    FOR con_name IN
        SELECT con.conname FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace ns ON ns.oid = rel.relnamespace
        WHERE ns.nspname = current_schema() AND rel.relname = 'settlement_details'
          AND con.conname = 'uk_settlement_detail_revenue'
    LOOP
        EXECUTE format('ALTER TABLE settlement_details RENAME CONSTRAINT %I TO %I',
                       con_name, 'uk_settlement_detail_provider_revenue');
    END LOOP;

    IF EXISTS (SELECT 1 FROM pg_indexes
               WHERE schemaname = current_schema() AND indexname = 'idx_settlement_detail_revenue') THEN
        EXECUTE 'DROP INDEX IF EXISTS idx_settlement_detail_revenue';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                   WHERE schemaname = current_schema() AND indexname = 'idx_settlement_detail_provider_revenue') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_settlement_detail_provider_revenue ON settlement_details (provider_revenue_id)';
    END IF;
END $$;


-- ── 8. `destination_requests.partner_id` → `requester_user_id` ───────────────────
--    Người gửi đề xuất là User (đối tác) — đổi tên cho đúng ngữ nghĩa.
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = current_schema() AND table_name = 'destination_requests'
                 AND column_name = 'partner_id')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema = current_schema() AND table_name = 'destination_requests'
                         AND column_name = 'requester_user_id') THEN
        ALTER TABLE destination_requests RENAME COLUMN partner_id TO requester_user_id;
    END IF;
END $$;

DO $$
BEGIN
    -- Bảng `destination_requests` chưa tồn tại trên DB mới (Flyway chạy trước Hibernate).
    IF to_regclass('destination_requests') IS NULL THEN
        RETURN;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_indexes
               WHERE schemaname = current_schema() AND indexname = 'idx_destination_requests_partner') THEN
        EXECUTE 'DROP INDEX IF EXISTS idx_destination_requests_partner';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                   WHERE schemaname = current_schema() AND indexname = 'idx_destination_requests_requester') THEN
        EXECUTE 'CREATE INDEX IF NOT EXISTS idx_destination_requests_requester ON destination_requests (requester_user_id, created_at DESC)';
    END IF;
END $$;


-- ── 9. Bảo đảm không còn cột `partner_id` ở các bảng đã chuẩn hóa ────────────────
DO $$
DECLARE
    t TEXT;
BEGIN
    FOREACH t IN ARRAY ARRAY['provider_profiles', 'provider_revenues', 'wallets',
                             'settlements', 'financial_adjustments', 'settlement_details',
                             'destination_requests']
    LOOP
        IF EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema() AND table_name = t
                     AND column_name = 'partner_id') THEN
            EXECUTE format('ALTER TABLE %I DROP COLUMN IF EXISTS partner_id', t);
        END IF;
    END LOOP;
END $$;


-- ── 10. Dọn bản ghi ProviderProfile "rác" không còn User hợp lệ ────────────────
--    (Dữ liệu dev có thể reset — nhưng vẫn giữ an toàn cho DB đang chạy.)
--    Bỏ qua nếu bảng `users` chưa tồn tại (DB mới — Flyway chạy trước Hibernate).
DO $$
BEGIN
    IF to_regclass('users') IS NULL OR to_regclass('provider_profiles') IS NULL THEN
        RETURN;
    END IF;

    DELETE FROM provider_profiles p
    WHERE p.user_id IS NULL
       OR NOT EXISTS (SELECT 1 FROM users u WHERE u.id = p.user_id);
END $$;

-- =====================================================================================
--  Hết V5.
-- =====================================================================================
