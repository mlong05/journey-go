-- =====================================================================================
--  SEED 01 — TÀI KHOẢN DEMO & DANH MỤC DEMO
-- =====================================================================================
--  Mục đích
--    Tạo toàn bộ tài khoản & danh mục cần cho bản DEMO:
--      • Tài khoản Admin / Moderator / Tourist (demo)
--      • 5 đối tác (partner) — trong đó có provider@journeygo.com
--      • Hồ sơ đối tác (provider_profiles) + ví nội bộ (wallets)
--      • Voucher nền tảng (PLATFORM) + voucher của từng đối tác (PARTNER)
--      • Điểm thưởng ban đầu & huy hiệu (badge) của nền tảng
--      • 5 điểm di tích văn hóa lịch sử mẫu
--
--  ⚠️ CHẠY THỦ CÔNG, KHÔNG TỰ CHẠY KHI BACKEND KHỞI ĐỘNG.
--     Dữ liệu nền tảng cố định (Roles, TaskTypes, PointRules, Regions, Themes...)
--     do `DataInitializer.java` đảm bảo — file này KHÔNG seed lại những thứ đó.
--
--  IDEMPOTENT: chạy lại nhiều lần vẫn an toàn (kiểm tra theo email / code trước khi INSERT).
--
--  Cách chạy:
--     psql -h localhost -U postgres -d journeygo_db -f 01_demo_accounts.sql
--     hoặc dùng Java Seed Runner (xem README.md cùng thư mục).
-- =====================================================================================

\set ON_ERROR_STOP on

DO $seed$
DECLARE
    -- Mật khẩu chung: "Password123@" — lấy hash bcrypt đã có sẵn trong DB.
    -- Nếu DB chưa có user nào, dùng hash bcrypt tĩnh của chuỗi trên.
    v_pw                text;
    v_role_admin        bigint;
    v_role_moderator    bigint;
    v_role_tourist      bigint;
    v_role_provider     bigint;
    v_admin_id          bigint;
    v_user_id           bigint;
    v_profile_id        bigint;
    v_wallet_id         bigint;
    v_created           timestamptz := NOW();

    -- Danh sách 5 đối tác demo
    v_emails   text[]    := ARRAY[
        'provider@journeygo.com',
        'provider3@journeygo.com',
        'provider4@journeygo.com',
        'provider5@journeygo.com',
        'provider6@journeygo.com'
    ];
    v_names    text[]    := ARRAY[
        'Ban Quản Lý Tràng An',
        'Sapa Trekking Co-op',
        'Mekong Delta Tours',
        'Hoi An Heritage Journey',
        'Phu Quoc Island Resort'
    ];
    v_phones   text[]    := ARRAY[
        '0900000004', '0900000013', '0900000014', '0900000015', '0900000016'
    ];
    -- Hoa hồng thống nhất 20% cho toàn bộ 5 đối tác demo.
    v_rates    numeric[] := ARRAY[0.2000, 0.2000, 0.2000, 0.2000, 0.2000];
    v_i        int;
BEGIN
    -- ── 0. Chuẩn bị ──────────────────────────────────────────────────────────
    -- Hash bcrypt của "Password123@" (fallback khi DB hoàn toàn trống).
    v_pw := '$2a$10$IINka0YRGQW4UpN5EGuXfeXNGduneF.YGqLufgdA4Df9lmxpB/oKC';
    -- Nếu đã có user thì dùng lại hash hiện tại (giữ nguyên mật khẩu đã đổi).
    SELECT password INTO v_pw FROM users WHERE email = 'provider@journeygo.com' LIMIT 1;
    IF v_pw IS NULL THEN
        SELECT password INTO v_pw FROM users WHERE email = 'admin@journeygo.com' LIMIT 1;
    END IF;
    IF v_pw IS NULL THEN
        v_pw := '$2a$10$IINka0YRGQW4UpN5EGuXfeXNGduneF.YGqLufgdA4Df9lmxpB/oKC';
    END IF;

    SELECT id INTO v_role_admin     FROM roles WHERE name = 'ADMIN';
    SELECT id INTO v_role_moderator FROM roles WHERE name = 'CONTENT_MODERATOR';
    SELECT id INTO v_role_tourist   FROM roles WHERE name = 'TOURIST';
    SELECT id INTO v_role_provider  FROM roles WHERE name = 'CONTENT_PROVIDER';

    IF v_role_admin IS NULL OR v_role_moderator IS NULL
       OR v_role_tourist IS NULL OR v_role_provider IS NULL THEN
        RAISE EXCEPTION 'Thiếu Role hệ thống. Hãy khởi động Backend 1 lần để DataInitializer tạo Role.';
    END IF;

    -- ── 1. Tài khoản ADMIN & MODERATOR ───────────────────────────────────────
    SELECT id INTO v_user_id FROM users WHERE email = 'admin@journeygo.com';
    IF v_user_id IS NULL THEN
        INSERT INTO users (email, password, full_name, phone, role_id, active, created_at, updated_at)
        VALUES ('admin@journeygo.com', v_pw, 'Hệ Thống Quản Trị', '0900000001', v_role_admin, TRUE, v_created, v_created)
        RETURNING id INTO v_user_id;
    END IF;
    v_admin_id := v_user_id;

    SELECT id INTO v_user_id FROM users WHERE email = 'moderator@journeygo.com';
    IF v_user_id IS NULL THEN
        INSERT INTO users (email, password, full_name, phone, role_id, active, created_at, updated_at)
        VALUES ('moderator@journeygo.com', v_pw, 'Chuyên Viên Thẩm Định', '0900000003', v_role_moderator, TRUE, v_created, v_created)
        RETURNING id INTO v_user_id;
    END IF;

    -- ── 2. Tài khoản TOURIST demo ────────────────────────────────────────────
    -- tourist@  : tài khoản du khách "chính" (100 điểm thưởng ban đầu)
    -- tourist1@ : dùng cho kịch bản test booking
    -- tourist2@ : dùng cho kịch bản test booking / hoàn tiền
    SELECT id INTO v_user_id FROM users WHERE email = 'tourist@journeygo.com';
    IF v_user_id IS NULL THEN
        INSERT INTO users (email, password, full_name, phone, role_id, active, created_at, updated_at)
        VALUES ('tourist@journeygo.com', v_pw, 'Nguyễn An', '0988123456', v_role_tourist, TRUE, v_created, v_created)
        RETURNING id INTO v_user_id;
    END IF;
    -- 100 điểm thưởng ban đầu
    IF NOT EXISTS (SELECT 1 FROM user_points WHERE user_id = v_user_id) THEN
        INSERT INTO user_points (user_id, current_balance, lifetime_earned, lifetime_spent, updated_at)
        VALUES (v_user_id, 100, 100, 0, v_created);
    END IF;

    SELECT id INTO v_user_id FROM users WHERE email = 'tourist1@journeygo.com';
    IF v_user_id IS NULL THEN
        INSERT INTO users (email, password, full_name, phone, role_id, active, created_at, updated_at)
        VALUES ('tourist1@journeygo.com', v_pw, 'Nguyễn Văn A', '0912345678', v_role_tourist, TRUE, v_created, v_created)
        RETURNING id INTO v_user_id;
    END IF;

    SELECT id INTO v_user_id FROM users WHERE email = 'tourist2@journeygo.com';
    IF v_user_id IS NULL THEN
        INSERT INTO users (email, password, full_name, phone, role_id, active, created_at, updated_at)
        VALUES ('tourist2@journeygo.com', v_pw, 'Nguyễn Văn B', '0912345679', v_role_tourist, TRUE, v_created, v_created)
        RETURNING id INTO v_user_id;
    END IF;

    -- ── 3. 5 đối tác: user + provider_profile + wallet ───────────────────────
    FOR v_i IN 1..5 LOOP
        -- 3.1 User
        SELECT id INTO v_user_id FROM users WHERE email = v_emails[v_i];
        IF v_user_id IS NULL THEN
            INSERT INTO users (email, password, full_name, phone, role_id, active, created_at, updated_at)
            VALUES (v_emails[v_i], v_pw, v_names[v_i], v_phones[v_i], v_role_provider, TRUE, v_created, v_created)
            RETURNING id INTO v_user_id;
        END IF;

        -- 3.2 ProviderProfile
        SELECT id INTO v_profile_id FROM provider_profiles WHERE user_id = v_user_id;
        IF v_profile_id IS NULL THEN
            INSERT INTO provider_profiles (user_id, provider_name, commission_rate, active, created_at, updated_at)
            VALUES (v_user_id, v_names[v_i], v_rates[v_i], TRUE, v_created, v_created)
            RETURNING id INTO v_profile_id;
        ELSE
            UPDATE provider_profiles
            SET provider_name = v_names[v_i],
                commission_rate = v_rates[v_i],
                active = TRUE,
                updated_at = v_created
            WHERE id = v_profile_id;
        END IF;

        -- 3.3 Ví nội bộ (dùng để nhận tiền khi đợt tất toán được duyệt)
        SELECT id INTO v_wallet_id FROM wallets WHERE provider_profile_id = v_profile_id;
        IF v_wallet_id IS NULL THEN
            INSERT INTO wallets (provider_profile_id, balance, currency, created_at, updated_at)
            VALUES (v_profile_id, 0, 'VND', v_created, v_created)
            RETURNING id INTO v_wallet_id;
        END IF;

        RAISE NOTICE 'Đối tác %: user=%, profile=%, wallet=%', v_emails[v_i], v_user_id, v_profile_id, v_wallet_id;
    END LOOP;

    -- ── 4. Voucher NỀN TẢNG (scope = PLATFORM) ───────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM vouchers WHERE code = 'JG-VOUCHER-50K') THEN
        INSERT INTO vouchers (code, title, description, voucher_scope, discount_type, discount_value,
                              min_order_amount, points_required, total_quantity, remaining_quantity,
                              valid_days, is_active, created_at, updated_at)
        VALUES ('JG-VOUCHER-50K', 'Giảm 50.000đ khi đặt Tour di sản',
                'Áp dụng cho mọi tour trải nghiệm trên hệ thống JourneyGo',
                'PLATFORM', 'FIXED_AMOUNT', 50000.00, 150000.00, 50, 100, 100, 30, TRUE, v_created, v_created);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM vouchers WHERE code = 'JG-VOUCHER-10PCT') THEN
        INSERT INTO vouchers (code, title, description, voucher_scope, discount_type, discount_value,
                              min_order_amount, max_discount_amount, points_required, total_quantity,
                              remaining_quantity, valid_days, is_active, created_at, updated_at)
        VALUES ('JG-VOUCHER-10PCT', 'Giảm 10% Tour văn hóa lịch sử',
                'Giảm tối đa 100.000đ cho đơn đặt tour bất kỳ',
                'PLATFORM', 'PERCENTAGE', 10.00, 200000.00, 100000.00, 80, 50, 50, 45, TRUE, v_created, v_created);
    END IF;

    -- ── 5. Voucher riêng của từng đối tác (scope = PARTNER) ──────────────────
    FOR v_i IN 1..5 LOOP
        SELECT p.id INTO v_profile_id
        FROM provider_profiles p JOIN users u ON u.id = p.user_id
        WHERE u.email = v_emails[v_i];

        IF NOT EXISTS (SELECT 1 FROM vouchers WHERE code = 'JG-PARTNER-' || v_i || '-50K') THEN
            INSERT INTO vouchers (code, title, description, voucher_scope, partner_id, discount_type,
                                  discount_value, min_order_amount, points_required, total_quantity,
                                  remaining_quantity, valid_days, is_active, created_at, updated_at)
            VALUES ('JG-PARTNER-' || v_i || '-50K',
                    'Giảm 50.000đ cho tour của ' || v_names[v_i],
                    'Voucher do đối tác ' || v_names[v_i] || ' phát hành.',
                    'PARTNER', v_profile_id, 'FIXED_AMOUNT', 50000.00, 150000.00, 0, 5000, 5000, 30,
                    TRUE, v_created, v_created);
        END IF;
    END LOOP;

    -- ── 6. Huy hiệu (badge) của nền tảng ─────────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM badges WHERE code = 'BADGE_VAN_MIEU') THEN
        INSERT INTO badges (code, name, description, icon_url, badge_type, bonus_points, is_active, created_at)
        VALUES ('BADGE_VAN_MIEU', 'Dấu ấn Văn Miếu Quốc Tử Giám',
                'Đã đặt chân và khám phá trường đại học đầu tiên của Việt Nam',
                'https://assets.journeygo.com/badges/van_mieu.png', 'DESTINATION_CHECKIN', 10, TRUE, v_created);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM badges WHERE code = 'BADGE_HOANG_THANH') THEN
        INSERT INTO badges (code, name, description, icon_url, badge_type, bonus_points, is_active, created_at)
        VALUES ('BADGE_HOANG_THANH', 'Chiến tích Hoàng Thành Thăng Long',
                'Khám phá trung tâm quyền lực lịch sử của kinh thành xưa',
                'https://assets.journeygo.com/badges/hoang_thanh.png', 'DESTINATION_CHECKIN', 10, TRUE, v_created);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM badges WHERE code = 'BADGE_BAT_TRANG') THEN
        INSERT INTO badges (code, name, description, icon_url, badge_type, bonus_points, is_active, created_at)
        VALUES ('BADGE_BAT_TRANG', 'Nghệ nhân Gốm Sứ Bát Tràng',
                'Tự tay trải nghiệm nét đẹp làng nghề gốm truyền thống',
                'https://assets.journeygo.com/badges/bat_trang.png', 'DESTINATION_CHECKIN', 10, TRUE, v_created);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM badges WHERE code = 'BADGE_TRANG_AN') THEN
        INSERT INTO badges (code, name, description, icon_url, badge_type, bonus_points, is_active, created_at)
        VALUES ('BADGE_TRANG_AN', 'Tuyệt tác Di sản Tràng An',
                'Khám phá quần thể di sản thiên nhiên và văn hóa thế giới',
                'https://assets.journeygo.com/badges/trang_an.png', 'DESTINATION_CHECKIN', 10, TRUE, v_created);
    END IF;

    -- ── 7. Điểm di tích văn hóa lịch sử mẫu ──────────────────────────────────
    IF NOT EXISTS (SELECT 1 FROM destinations WHERE name = 'Văn Miếu – Quốc Tử Giám' AND deleted = FALSE) THEN
        INSERT INTO destinations (name, address, latitude, longitude, capacity, approved, deleted,
                                  status, region_id, created_by, created_at, updated_at)
        SELECT 'Văn Miếu – Quốc Tử Giám', '58 Quốc Tử Giám, Văn Miếu, Đống Đa, Hà Nội',
               21.0277000, 105.8351000, 5000, TRUE, FALSE, 'PUBLISHED', r.id, v_admin_id, v_created, v_created
        FROM regions r WHERE r.slug = 'mien-bac' LIMIT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM destinations WHERE name = 'Hoàng Thành Thăng Long' AND deleted = FALSE) THEN
        INSERT INTO destinations (name, address, latitude, longitude, capacity, approved, deleted,
                                  status, region_id, created_by, created_at, updated_at)
        SELECT 'Hoàng Thành Thăng Long', '19C Hoàng Diệu, Quán Thánh, Ba Đình, Hà Nội',
               21.0364000, 105.8353000, 8000, TRUE, FALSE, 'PUBLISHED', r.id, v_admin_id, v_created, v_created
        FROM regions r WHERE r.slug = 'mien-bac' LIMIT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM destinations WHERE name = 'Làng Gốm Bát Tràng' AND deleted = FALSE) THEN
        INSERT INTO destinations (name, address, latitude, longitude, capacity, approved, deleted,
                                  status, region_id, created_by, created_at, updated_at)
        SELECT 'Làng Gốm Bát Tràng', 'Bát Tràng, Gia Lâm, Hà Nội',
               20.9785000, 105.9126000, 3000, TRUE, FALSE, 'PUBLISHED', r.id, v_admin_id, v_created, v_created
        FROM regions r WHERE r.slug = 'mien-bac' LIMIT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM destinations WHERE name = 'Quần Thể Di Sản Tràng An' AND deleted = FALSE) THEN
        INSERT INTO destinations (name, address, latitude, longitude, capacity, approved, deleted,
                                  status, region_id, created_by, created_at, updated_at)
        SELECT 'Quần Thể Di Sản Tràng An', 'Tràng An, Hoa Lư, Ninh Bình',
               20.2506000, 105.9048000, 10000, TRUE, FALSE, 'PUBLISHED', r.id, v_admin_id, v_created, v_created
        FROM regions r WHERE r.slug = 'mien-bac' LIMIT 1;
    END IF;

    IF NOT EXISTS (SELECT 1 FROM destinations WHERE name = 'Chùa Trấn Quốc & Hồ Tây' AND deleted = FALSE) THEN
        INSERT INTO destinations (name, address, latitude, longitude, capacity, approved, deleted,
                                  status, region_id, created_by, created_at, updated_at)
        SELECT 'Chùa Trấn Quốc & Hồ Tây', 'Đường Thanh Niên, Yên Phụ, Tây Hồ, Hà Nội',
               21.0483000, 105.8368000, 4000, TRUE, FALSE, 'PUBLISHED', r.id, v_admin_id, v_created, v_created
        FROM regions r WHERE r.slug = 'mien-bac' LIMIT 1;
    END IF;

    RAISE NOTICE 'Seed tài khoản demo hoàn tất.';
END $seed$;
