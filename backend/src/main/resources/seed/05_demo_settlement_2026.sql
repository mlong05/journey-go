-- =====================================================================================
--  SEED 05 — 5 ĐỐI TÁC + GIAO DỊCH TẤT TOÁN 2026-01 → 2026-10
-- =====================================================================================
--  Mục đích
--    Chuẩn bị dữ liệu tài chính đủ phong phú để Admin TỰ TAY tạo & duyệt đợt tất toán
--    (scope = BATCH — gom toàn bộ đối tác) từ tab "Ứng viên tất toán".
--
--  Nội dung
--    1) 5 đối tác: giữ nguyên `provider@journeygo.com` sẵn có + 4 đối tác mới
--       (provider3 → provider6). Mỗi đối tác có ProviderProfile + Wallet + 1 tour riêng
--       + 1 voucher PARTNER riêng (tạo ở 01_demo_accounts.sql).
--    2) Mỗi đối tác × mỗi tháng (2026-01 → 2026-10): 5 – 10 giao dịch thành công:
--         • Booking   status = COMPLETED
--         • Payment   status = SUCCESS (VNPAY)
--         • Voucher   áp dụng (luân phiên PLATFORM của sàn ↔ PARTNER của đối tác)
--         • Refund    đã hoàn thành thành công (REFUNDED) ở một phần giao dịch
--         • ProviderRevenue status = ELIGIBLE, settlement_id = NULL
--
--  ⚠️ KHÔNG seed bất kỳ đợt tất toán nào — Admin tự tạo để kiểm thử luồng.
--
--  ⚠️ YÊU CẦU: chạy `01_demo_accounts.sql` TRƯỚC (cần 5 đối tác + voucher + khách du lịch).
--
--  IDEMPOTENT: mã booking dùng tiền tố `JGB26` — nếu đã có thì bỏ qua toàn bộ.
--
--  Cách chạy:
--     psql -h localhost -U postgres -d journeygo_db -f 05_demo_settlement_2026.sql
-- =====================================================================================

\set ON_ERROR_STOP on

DO $seed$
DECLARE
    -- === Cấu hình 5 đối tác ===
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
    v_prices   numeric[] := ARRAY[800000, 1500000, 1100000, 850000, 1300000];
    -- Hoa hồng thống nhất 20% cho toàn bộ 5 đối tác demo.
    v_rates    numeric[] := ARRAY[0.2000, 0.2000, 0.2000, 0.2000, 0.2000];
    v_regions  text[]    := ARRAY['mien-bac', 'mien-trung', 'mien-nam', 'mien-trung', 'mien-nam'];
    v_themes   text[]    := ARRAY['di-san', 'lang-nghe', 'am-thuc', 'di-san', 'tam-linh'];

    -- === Biến vòng lặp ===
    v_p               int;
    v_month           int;
    v_i               int;
    v_n               int;
    v_day             int;
    v_user_id         bigint;
    v_profile_id      bigint;
    v_wallet_id       bigint;
    v_tour_id         bigint;
    v_voucher_id      bigint;
    v_platform_voucher bigint;
    v_region_id       bigint;
    v_theme_id        bigint;
    v_admin_id        bigint;
    v_tourist_ids     bigint[];
    v_tourist_id      bigint;
    v_booking_id      bigint;
    v_payment_id      bigint;
    v_user_voucher_code varchar(100);
    v_booking_code    varchar(32);
    v_txn_seq         int;

    v_exp_date        date;
    v_created_at      timestamptz;
    v_paid_at         timestamptz;
    v_completed_at    timestamptz;
    v_orig_price      numeric(14,2);
    v_discount        numeric(14,2) := 0;
    v_total           numeric(14,2);
    v_refund          numeric(14,2) := 0;
    v_gross           numeric(14,2);
    v_net_collected   numeric(14,2);
    v_commission      numeric(14,2);
    v_partner_net     numeric(14,2);
    v_scope           varchar(20);
    v_seeded          int;
BEGIN
    -- ── 0. Kiểm tra đã seed chưa ─────────────────────────────────────────────
    SELECT count(*) INTO v_seeded FROM bookings WHERE booking_code LIKE 'JGB26%';
    IF v_seeded > 0 THEN
        RAISE NOTICE 'Đã có booking mã JGB26 — bỏ qua seed để tránh trùng.';
        RETURN;
    END IF;

    SELECT id INTO v_admin_id FROM users WHERE email = 'admin@journeygo.com';
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Thiếu tài khoản admin. Hãy chạy 01_demo_accounts.sql trước.';
    END IF;

    -- Voucher nền tảng dùng chung
    SELECT id INTO v_platform_voucher FROM vouchers WHERE code = 'JG-VOUCHER-50K';
    IF v_platform_voucher IS NULL THEN
        RAISE EXCEPTION 'Thiếu voucher JG-VOUCHER-50K. Hãy chạy 01_demo_accounts.sql trước.';
    END IF;

    -- Danh sách khách du lịch làm người đặt tour
    SELECT array_agg(id ORDER BY id) INTO v_tourist_ids
    FROM users
    WHERE role_id = (SELECT id FROM roles WHERE name = 'TOURIST')
      AND id IN (SELECT tourist_id FROM bookings);

    IF v_tourist_ids IS NULL OR array_length(v_tourist_ids, 1) IS NULL THEN
        -- Chưa có booking nào ⇒ lấy tất cả tài khoản TOURIST.
        SELECT array_agg(id ORDER BY id) INTO v_tourist_ids
        FROM users
        WHERE role_id = (SELECT id FROM roles WHERE name = 'TOURIST');
    END IF;

    IF v_tourist_ids IS NULL OR array_length(v_tourist_ids, 1) IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy khách du lịch nào — cần ít nhất 1 tài khoản TOURIST.';
    END IF;

    -- ── 1. Tạo 5 đối tác (user + provider_profile + wallet + tour) ────────────
    FOR v_p IN 1..5 LOOP
        SELECT id INTO v_user_id FROM users WHERE email = v_emails[v_p];
        IF v_user_id IS NULL THEN
            RAISE EXCEPTION 'Thiếu tài khoản đối tác % — hãy chạy 01_demo_accounts.sql trước.', v_emails[v_p];
        END IF;

        SELECT id INTO v_profile_id FROM provider_profiles WHERE user_id = v_user_id;
        IF v_profile_id IS NULL THEN
            RAISE EXCEPTION 'Thiếu provider_profile cho % — hãy chạy 01_demo_accounts.sql trước.', v_emails[v_p];
        END IF;

        SELECT id INTO v_wallet_id FROM wallets WHERE provider_profile_id = v_profile_id;
        IF v_wallet_id IS NULL THEN
            INSERT INTO wallets (provider_profile_id, balance, currency, created_at, updated_at)
            VALUES (v_profile_id, 0, 'VND', NOW(), NOW())
            RETURNING id INTO v_wallet_id;
        END IF;

        SELECT id INTO v_region_id FROM regions WHERE slug = v_regions[v_p];
        SELECT id INTO v_theme_id  FROM themes  WHERE slug = v_themes[v_p];

        -- Voucher riêng của đối tác
        SELECT id INTO v_voucher_id FROM vouchers WHERE code = 'JG-PARTNER-' || v_p || '-50K';

        -- Tour riêng của đối tác (luồng 5 bước ⇒ tour_format khác null ⇒ toàn bộ doanh thu
        -- của booking thuộc về đối tác tạo tour)
        SELECT tour_id INTO v_tour_id
        FROM tours
        WHERE created_by = v_user_id AND title IN ('Trải nghiệm ' || v_names[v_p],
                                                   'Trai nghiem ' || v_names[v_p])
        LIMIT 1;

        IF v_tour_id IS NULL THEN
            INSERT INTO tours (title, tour_type, tour_format, duration_minutes, duration_days,
                               status, approved, deleted, version_number, created_by,
                               region_id, theme_id, description, max_guests_per_slot,
                               content_rights_confirmed, price_includes, price_excludes,
                               cancellation_policy, refund_policy, contact_info,
                               cover_image_url, created_at, updated_at, published_at)
            VALUES ('Trải nghiệm ' || v_names[v_p], 'OTHER', 'DAY_TRIP', 480, 1,
                    'PUBLISHED', TRUE, FALSE, 1, v_user_id,
                    v_region_id, v_theme_id,
                    'Tour trải nghiệm của ' || v_names[v_p] || ' — dữ liệu tài chính mẫu.',
                    50, TRUE,
                    'Vé tham quan, ăn trưa, nước uống',
                    'Chi phí cá nhân, quà tặng',
                    'Hủy trước 48h - hoàn 50 phần trăm',
                    'Hoàn tiền theo chính sách của nền tảng',
                    'Liên hệ: ' || v_emails[v_p],
                    'https://img.journeygo.com/tours/' || v_emails[v_p] || '/cover.jpg',
                    NOW(), NOW(), NOW())
            RETURNING tour_id INTO v_tour_id;

            INSERT INTO tour_prices (tour_id, guest_type, price, counts_toward_slot) VALUES
                (v_tour_id, 'ADULT',   v_prices[v_p], TRUE),
                (v_tour_id, 'CHILD',   round(v_prices[v_p] * 0.60, 2), TRUE),
                (v_tour_id, 'TODDLER', round(v_prices[v_p] * 0.30, 2), TRUE),
                (v_tour_id, 'INFANT',  0, FALSE);

            -- Lịch khởi hành trong năm 2026 (đủ để booking có slot)
            INSERT INTO tour_departure_dates (tour_id, departure_date)
            SELECT v_tour_id, make_date(2026, m, d)
            FROM generate_series(1, 12) AS m, generate_series(5, 25, 10) AS d;

            INSERT INTO tour_slots (tour_id, slot_date, capacity, booked_count, status, created_at, max_guests_per_slot)
            SELECT v_tour_id, d, 50, 0, 'OPEN', NOW(), 50
            FROM (
                SELECT make_date(2026, m, dd) AS d
                FROM generate_series(1, 12) AS m, generate_series(5, 25, 10) AS dd
            ) slots
            ON CONFLICT DO NOTHING;
        END IF;

        RAISE NOTICE 'Đối tác %: profile=%, tour=%, voucher=%',
            v_emails[v_p], v_profile_id, v_tour_id, v_voucher_id;

        -- ── 2. Giao dịch theo từng tháng (2026-01 → 2026-10) ─────────────────
        FOR v_month IN 1..10 LOOP
            -- 5 → 10 giao dịch / đối tác / tháng (dao động theo đối tác + tháng).
            v_n := 5 + ((v_p * 3 + v_month) % 6);

            FOR v_i IN 1..v_n LOOP
                v_day      := 3 + (v_i * 2);                       -- 5, 7, 9 ... 23
                v_exp_date := make_date(2026, v_month, v_day);
                v_created_at   := (v_exp_date - 3)::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh';
                v_paid_at      := v_created_at + interval '5 minutes';
                v_completed_at := ((v_exp_date + 1)::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')
                                  + interval '17 hours';

                -- Giá gốc dao động nhẹ theo tháng & chỉ số giao dịch
                v_orig_price := round(v_prices[v_p] * (1 + ((v_i + v_month + v_p) % 4) * 0.1), 2);

                -- === Voucher ===
                v_discount := 0;
                v_scope := NULL;
                IF (v_i % 3) = 1 THEN
                    IF (v_i % 2) = 1 THEN
                        -- Voucher NỀN TẢNG: nền tảng chịu phần giảm
                        v_scope    := 'PLATFORM';
                        v_discount := 50000;
                    ELSE
                        -- Voucher ĐỐI TÁC: đối tác chịu phần giảm
                        v_scope    := 'PARTNER';
                        v_discount := least(round(v_orig_price * 0.10, 2), 100000);
                    END IF;
                END IF;

                v_total := v_orig_price - v_discount;

                -- === Refund (đã hoàn thành thành công) ===
                v_refund := 0;
                IF (v_i % 4) = 2 THEN
                    v_refund := round(v_total * 0.5, 2);
                END IF;

                -- === Tính toán tài chính (đúng công thức ProviderRevenue#recalculate) ===
                v_gross         := v_orig_price;                    -- GROSS = giá gốc
                v_net_collected := v_gross - v_refund;
                v_commission    := round(v_net_collected * v_rates[v_p], 2);
                v_partner_net   := v_net_collected - v_commission;

                IF v_scope = 'PLATFORM' THEN
                    -- Nền tảng chịu giảm giá → hoa hồng bị trừ, đối tác nhận trọn
                    v_commission  := greatest(v_commission - v_discount, 0);
                ELSIF v_scope = 'PARTNER' THEN
                    -- Đối tác chịu giảm giá → đối tác bị trừ, nền tảng giữ nguyên hoa hồng
                    v_partner_net := greatest(v_partner_net - v_discount, 0);
                END IF;

                -- === Mã định danh ===
                v_booking_code := 'JGB26' || lpad(v_month::text, 2, '0') || v_p::text
                                  || lpad(v_i::text, 2, '0');
                v_tourist_id := v_tourist_ids[((v_p + v_month + v_i) % array_length(v_tourist_ids, 1)) + 1];

                -- === Booking ===
                INSERT INTO bookings (booking_code, tourist_id, tour_id, experience_date,
                                      total_amount, discount_amount, voucher_scope, currency,
                                      status, created_at, payment_deadline, paid_at, confirmed_at,
                                      completed_at, slot_count, updated_at)
                VALUES (v_booking_code, v_tourist_id, v_tour_id, v_exp_date,
                        v_total, v_discount, v_scope, 'VND',
                        'COMPLETED', v_created_at, v_created_at + interval '10 minutes',
                        v_paid_at, v_paid_at, v_completed_at, 1, v_created_at)
                RETURNING id INTO v_booking_id;

                -- === Hành khách ===
                INSERT INTO booking_passengers (booking_id, full_name, birth_date, gender, email,
                                                guest_type, price, counts_toward_slot,
                                                is_booking_customer, linked_user_id, status,
                                                created_at, updated_at)
                SELECT v_booking_id, u.full_name, DATE '1992-05-14', 'MALE', u.email,
                       'ADULT', v_total, TRUE, TRUE, u.id, 'ACTIVE', v_created_at, v_created_at
                FROM users u WHERE u.id = v_tourist_id;

                -- === Giữ chỗ slot ===
                INSERT INTO booking_slot_holds (booking_id, tour_slot_id, slot_type, slot_date,
                                                slot_count, released, held_at)
                SELECT v_booking_id, ts.id, 'TOUR', v_exp_date, 1, FALSE, v_created_at
                FROM tour_slots ts
                WHERE ts.tour_id = v_tour_id AND ts.slot_date = v_exp_date
                LIMIT 1;

                -- === UserVoucher (voucher đã dùng) ===
                IF v_scope IS NOT NULL THEN
                    v_user_voucher_code := 'JGU-' || v_booking_code;
                    INSERT INTO user_vouchers (user_id, voucher_id, user_voucher_code, status,
                                               expiry_date, redeemed_at, used_at,
                                               used_order_reference, points_spent)
                    SELECT v_tourist_id,
                           CASE WHEN v_scope = 'PLATFORM' THEN v_platform_voucher ELSE v_voucher_id END,
                           v_user_voucher_code, 'USED',
                           (v_exp_date + 30)::date, v_created_at, v_created_at,
                           v_booking_code, 0
                    WHERE NOT EXISTS (
                        SELECT 1 FROM user_vouchers uv WHERE uv.user_voucher_code = v_user_voucher_code
                    );

                    UPDATE bookings
                    SET applied_voucher_code = v_user_voucher_code
                    WHERE id = v_booking_id;
                END IF;

                -- === Payment (thanh toán thành công) ===
                v_txn_seq := v_month * 1000 + v_p * 100 + v_i;
                INSERT INTO payments (booking_id, txn_ref, vnp_transaction_no, vnp_bank_tran_no,
                                      bank_code, card_type, method, status, amount, currency,
                                      created_at, expires_at, paid_at, resolved_at,
                                      vnp_response_code, vnp_transaction_status, vnp_message,
                                      duplicate_payment, ipn_count, query_count, updated_at)
                VALUES (v_booking_id,
                        'JGTX' || v_booking_code,
                        'VNPAY' || lpad(v_txn_seq::text, 12, '0'),
                        'BANK' || lpad(v_txn_seq::text, 12, '0'),
                        'NCB', 'ATM', 'VNPAY', 'SUCCESS',
                        v_total, 'VND',
                        v_created_at, v_created_at + interval '10 minutes', v_paid_at, v_paid_at,
                        '00', '00', 'Giao dich thanh cong',
                        FALSE, 1, 0, v_created_at)
                RETURNING id INTO v_payment_id;

                -- === Refund (đã hoàn thành thành công) ===
                IF v_refund > 0 THEN
                    INSERT INTO refund_requests (refund_code, payment_id, tourist_id, status,
                                                declared_reason, approved_reason, reason_summary,
                                                proposed_amount, approved_amount, refunded_amount,
                                                currency, method, reviewed_by, reviewed_at,
                                                bank_account_number, bank_account_name, bank_name,
                                                transfer_reference, vnp_requested_at, vnp_resolved_at,
                                                transferred_at, created_at, updated_at)
                    VALUES ('JGR26' || v_booking_code, v_payment_id, v_tourist_id, 'REFUNDED',
                            'PERSONAL', 'PERSONAL', 'Khách không thể đi được do thời tiết xấu',
                            v_refund, v_refund, v_refund,
                            'VND', 'MANUAL_BANK_TRANSFER', v_admin_id, v_completed_at,
                            '0123456789', 'KHÁCH HÀNG', 'MB Bank',
                            'FT' || v_booking_code, v_completed_at, v_completed_at,
                            v_completed_at, v_completed_at, v_completed_at);
                END IF;

                -- === ProviderRevenue (đủ điều kiện tất toán, CHƯA gắn đợt) ===
                INSERT INTO provider_revenues (provider_profile_id, booking_id, payment_id,
                                               revenue_period, completed_date, gross_amount,
                                               refund_amount, commission_amount, commission_rate,
                                               adjustment_amount, voucher_discount, voucher_scope,
                                               provider_net_amount, status, deferred_reason,
                                               settlement_id, eligible_at, settled_at,
                                               created_at, updated_at)
                VALUES (v_profile_id, v_booking_id, v_payment_id,
                        to_char(v_exp_date, 'YYYY-MM'), v_exp_date,
                        v_gross, v_refund, v_commission, v_rates[v_p],
                        0, v_discount, v_scope,
                        v_partner_net, 'ELIGIBLE', NULL,
                        NULL, v_completed_at, NULL,
                        v_created_at, v_created_at);
            END LOOP;
        END LOOP;
    END LOOP;

    RAISE NOTICE 'Seed doanh thu tất toán 2026 hoàn tất (5 đối tác, KHÔNG tạo đợt tất toán).';
END $seed$;

-- === Kiểm tra kết quả ===
\echo '=== 1. Số giao dịch theo đối tác x tháng ==='
SELECT pp.provider_name,
       pr.revenue_period,
       count(*)                    AS so_giao_dich,
       sum(pr.gross_amount)        AS tong_gross,
       sum(pr.refund_amount)       AS tong_hoan,
       sum(pr.commission_amount)   AS tong_hoa_hong,
       sum(pr.provider_net_amount) AS tong_doi_tac
FROM provider_revenues pr
JOIN provider_profiles pp ON pp.id = pr.provider_profile_id
WHERE pr.booking_id IN (SELECT id FROM bookings WHERE booking_code LIKE 'JGB26%')
GROUP BY pp.provider_name, pr.revenue_period
ORDER BY pp.provider_name, pr.revenue_period;

\echo '=== 2. Giao dịch có voucher / có refund ==='
SELECT count(*) FILTER (WHERE b.applied_voucher_code IS NOT NULL) AS co_voucher,
       count(*) FILTER (WHERE b.voucher_scope = 'PLATFORM')      AS voucher_nen_tang,
       count(*) FILTER (WHERE b.voucher_scope = 'PARTNER')       AS voucher_doi_tac,
       count(*) FILTER (WHERE r.status = 'REFUNDED')              AS da_hoan_tien
FROM bookings b
LEFT JOIN payments p ON p.booking_id = b.id
LEFT JOIN refund_requests r ON r.payment_id = p.id
WHERE b.booking_code LIKE 'JGB26%';

\echo '=== 3. Trạng thái khoản doanh thu (phải ELIGIBLE, chưa gắn đợt tất toán) ==='
SELECT status, settlement_id, count(*)
FROM provider_revenues
WHERE booking_id IN (SELECT id FROM bookings WHERE booking_code LIKE 'JGB26%')
GROUP BY status, settlement_id;

\echo '=== 4. Số đợt tất toán (phải bằng 0 — Admin tự tạo) ==='
SELECT count(*) AS so_dot_tat_toan FROM settlements;
