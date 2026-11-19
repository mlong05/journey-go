-- =====================================================================================
--  SEED 04 — GIAO DỊCH MẪU (BOOKING → PAYMENT → REFUND → PROVIDER REVENUE)
-- =====================================================================================
--  Mục đích
--    Sinh dữ liệu vận hành để chạy ngay các kịch bản test (booking, thanh toán,
--    hoàn tiền, doanh thu đối tác) mà không phải đặt tour thủ công.
--
--  Nội dung (mã booking tiền tố "JGSAMPLE"):
--    JGSAMPLE01 — COMPLETED, đã thanh toán (MOMO)
--    JGSAMPLE02 — COMPLETED, đã thanh toán (VNBANK)
--    JGSAMPLE03 — CONFIRMED, đã thanh toán (VNPAYQR) — chờ trải nghiệm hoàn thành
--    JGSAMPLE04 — PENDING_PAYMENT — sẽ tự EXPIRED sau 10 phút
--    JGSAMPLE05 — CANCELLED (không đi được do thời tiết xấu)
--    JGSAMPLE06 — COMPLETED, kỳ 3 tháng trước
--    JGSAMPLE07 — COMPLETED + Refund đã hoàn thành 50%
--    JGSAMPLE08 — COMPLETED + Refund đang chờ duyệt (chặn tất toán)
--    JGSAMPLE09 — COMPLETED, chưa có refund
--
--  ⚠️ KHÔNG seed đợt tất toán nào — Admin tự tạo từ tab "Ứng viên tất toán".
--
--  ⚠️ YÊU CẦU: chạy `01_demo_accounts.sql` + `02_demo_tours.sql` TRƯỚC.
--
--  IDEMPOTENT: booking đã tồn tại (theo booking_code) sẽ được bỏ qua.
--
--  Cách chạy:
--     psql -h localhost -U postgres -d journeygo_db -f 04_demo_transactions.sql
-- =====================================================================================

\set ON_ERROR_STOP on

DO $seed$
DECLARE
    v_admin_id       bigint;
    v_tourist1_id    bigint;
    v_tourist2_id    bigint;
    v_provider1_id   bigint;   -- chủ tour
    v_provider2_id   bigint;   -- chủ tour
    v_tour_id        bigint;
    v_booking_id     bigint;
    v_payment_id     bigint;
    v_slot_id        bigint;
    v_created        timestamptz := NOW();
    v_today          date      := CURRENT_DATE;
    v_prev_month     date;
    v_prev3_month    date;
    v_refund_amount  numeric(14,2);
    v_total          numeric(14,2);
    v_rate           numeric;
    v_slot_count     int;
BEGIN
    -- ── 0. Chuẩn bị ──────────────────────────────────────────────────────────
    SELECT id INTO v_admin_id FROM users WHERE email = 'admin@journeygo.com';
    SELECT id INTO v_tourist1_id FROM users WHERE email = 'tourist1@journeygo.com';
    SELECT id INTO v_tourist2_id FROM users WHERE email = 'tourist2@journeygo.com';
    IF v_admin_id IS NULL OR v_tourist1_id IS NULL OR v_tourist2_id IS NULL THEN
        RAISE EXCEPTION 'Thiếu tài khoản demo. Hãy chạy 01_demo_accounts.sql trước.';
    END IF;

    v_prev_month  := (date_trunc('month', CURRENT_DATE) - interval '1 month')::date + 20;
    v_prev3_month := (date_trunc('month', CURRENT_DATE) - interval '3 months')::date + 15;

    IF EXISTS (SELECT 1 FROM bookings WHERE booking_code LIKE 'JGSAMPLE%') THEN
        RAISE NOTICE 'Đã có booking JGSAMPLE — bỏ qua seed giao dịch mẫu.';
        RETURN;
    END IF;

    -- ── 1. JGSAMPLE01 — COMPLETED, kỳ trước, MOMO ───────────────────────────
    SELECT t.tour_id, pp.id INTO v_tour_id, v_provider1_id
    FROM tours t
    JOIN users u ON u.id = t.created_by
    JOIN provider_profiles pp ON pp.user_id = u.id
    WHERE t.title = 'Cần Thơ sông nước: chợ nổi Cái Răng, lò hủ tiếu và nhà cổ Bình Thủy'
    LIMIT 1;

    IF v_tour_id IS NOT NULL THEN
        v_total := 1350000;   -- 2 khách × 675.000 (giá ADULT của tour này)
        INSERT INTO bookings (booking_code, tourist_id, tour_id, experience_date, total_amount,
                              discount_amount, currency, status, created_at, payment_deadline,
                              paid_at, confirmed_at, completed_at, slot_count, updated_at)
        VALUES ('JGSAMPLE01', v_tourist1_id, v_tour_id, v_prev_month, v_total, 0, 'VND',
                'COMPLETED', v_prev_month::timestamptz, v_prev_month::timestamptz + interval '10 minutes',
                v_prev_month::timestamptz + interval '5 minutes',
                v_prev_month::timestamptz + interval '5 minutes',
                (v_prev_month + 1)::timestamptz + interval '16 hours', 2, v_created)
        RETURNING id INTO v_booking_id;

        INSERT INTO booking_passengers (booking_id, full_name, birth_date, gender, email, guest_type,
                                        price, counts_toward_slot, is_booking_customer, linked_user_id,
                                        status, created_at, updated_at)
        VALUES (v_booking_id, 'Nguyễn Văn A', '1988-05-12', 'MALE', 'tourist1@journeygo.com', 'ADULT',
                675000, TRUE, TRUE, v_tourist1_id, 'ACTIVE', v_created, v_created),
               (v_booking_id, 'Trần Thị B', '1990-09-03', 'FEMALE', 'tourist1@journeygo.com', 'ADULT',
                675000, TRUE, FALSE, NULL, 'ACTIVE', v_created, v_created);

        -- Giữ chỗ slot
        INSERT INTO tour_slots (tour_id, slot_date, capacity, booked_count, status, created_at, max_guests_per_slot)
        VALUES (v_tour_id, v_prev_month, 30, 2, 'OPEN', v_created, 30)
        ON CONFLICT DO NOTHING;
        SELECT id INTO v_slot_id FROM tour_slots WHERE tour_id = v_tour_id AND slot_date = v_prev_month LIMIT 1;
        IF v_slot_id IS NOT NULL THEN
            INSERT INTO booking_slot_holds (booking_id, tour_slot_id, slot_type, slot_date, slot_count, released, held_at)
            VALUES (v_booking_id, v_slot_id, 'TOUR', v_prev_month, 2, FALSE, v_created);
        END IF;

        INSERT INTO payments (booking_id, txn_ref, vnp_transaction_no, bank_code, card_type, method, status,
                              amount, currency, created_at, expires_at, paid_at, resolved_at, vnp_response_code,
                              vnp_transaction_status, vnp_message, duplicate_payment, ipn_count, query_count, updated_at)
        VALUES (v_booking_id, 'JGSAMPLE01-TXN', '91000001', 'MOMO', 'QRCODE', 'VNPAY', 'SUCCESS',
                v_total, 'VND', v_prev_month::timestamptz, v_prev_month::timestamptz + interval '10 minutes',
                v_prev_month::timestamptz + interval '5 minutes', v_prev_month::timestamptz + interval '5 minutes',
                '00', '00', 'Giao dich thanh cong', FALSE, 1, 0, v_created)
        RETURNING id INTO v_payment_id;

        -- Doanh thu đối tác — đủ điều kiện tất toán
        SELECT commission_rate INTO v_rate FROM provider_profiles WHERE id = v_provider1_id;
        INSERT INTO provider_revenues (provider_profile_id, booking_id, payment_id, revenue_period,
                                       completed_date, gross_amount, refund_amount, commission_amount,
                                       commission_rate, adjustment_amount, voucher_discount, voucher_scope,
                                       provider_net_amount, status, deferred_reason, settlement_id,
                                       eligible_at, settled_at, created_at, updated_at)
        VALUES (v_provider1_id, v_booking_id, v_payment_id, to_char(v_prev_month, 'YYYY-MM'), v_prev_month,
                v_total, 0, round(v_total * v_rate, 2), v_rate, 0, 0, NULL,
                round(v_total * (1 - v_rate), 2), 'ELIGIBLE', NULL, NULL,
                (v_prev_month + 1)::timestamptz + interval '16 hours', NULL, v_created, v_created);
    ELSE
        RAISE NOTICE 'Bỏ qua JGSAMPLE01 — chưa có tour Cần Thơ (chạy 02/03 trước).';
    END IF;

    -- ── 2. JGSAMPLE02 — COMPLETED, kỳ trước, VNBANK ─────────────────────────
    SELECT t.tour_id, pp.id INTO v_tour_id, v_provider2_id
    FROM tours t
    JOIN users u ON u.id = t.created_by
    JOIN provider_profiles pp ON pp.user_id = u.id
    WHERE t.title = 'Phố cổ Hội An: Chùa Cầu, nhà cổ Tấn Ký và hội quán Phúc Kiến'
    LIMIT 1;

    IF v_tour_id IS NOT NULL THEN
        v_total := 700000;
        INSERT INTO bookings (booking_code, tourist_id, tour_id, experience_date, total_amount,
                              discount_amount, currency, status, created_at, payment_deadline,
                              paid_at, confirmed_at, completed_at, slot_count, updated_at)
        VALUES ('JGSAMPLE02', v_tourist2_id, v_tour_id, v_prev_month, v_total, 0, 'VND',
                'COMPLETED', v_prev_month::timestamptz, v_prev_month::timestamptz + interval '10 minutes',
                v_prev_month::timestamptz + interval '5 minutes',
                v_prev_month::timestamptz + interval '5 minutes',
                (v_prev_month + 1)::timestamptz + interval '16 hours', 2, v_created)
        RETURNING id INTO v_booking_id;

        INSERT INTO booking_passengers (booking_id, full_name, birth_date, gender, email, guest_type,
                                        price, counts_toward_slot, is_booking_customer, linked_user_id,
                                        status, created_at, updated_at)
        VALUES (v_booking_id, 'Nguyễn Văn B', '1985-02-20', 'MALE', 'tourist2@journeygo.com', 'ADULT',
                350000, TRUE, TRUE, v_tourist2_id, 'ACTIVE', v_created, v_created),
               (v_booking_id, 'Lê Thị C', '1987-11-08', 'FEMALE', 'tourist2@journeygo.com', 'ADULT',
                350000, TRUE, FALSE, NULL, 'ACTIVE', v_created, v_created);

        INSERT INTO tour_slots (tour_id, slot_date, capacity, booked_count, status, created_at, max_guests_per_slot)
        VALUES (v_tour_id, v_prev_month, 30, 2, 'OPEN', v_created, 30)
        ON CONFLICT DO NOTHING;
        SELECT id INTO v_slot_id FROM tour_slots WHERE tour_id = v_tour_id AND slot_date = v_prev_month LIMIT 1;
        IF v_slot_id IS NOT NULL THEN
            INSERT INTO booking_slot_holds (booking_id, tour_slot_id, slot_type, slot_date, slot_count, released, held_at)
            VALUES (v_booking_id, v_slot_id, 'TOUR', v_prev_month, 2, FALSE, v_created);
        END IF;

        INSERT INTO payments (booking_id, txn_ref, vnp_transaction_no, bank_code, card_type, method, status,
                              amount, currency, created_at, expires_at, paid_at, resolved_at, vnp_response_code,
                              vnp_transaction_status, vnp_message, duplicate_payment, ipn_count, query_count, updated_at)
        VALUES (v_booking_id, 'JGSAMPLE02-TXN', '91000002', 'VNBANK', 'ATM', 'VNPAY', 'SUCCESS',
                v_total, 'VND', v_prev_month::timestamptz, v_prev_month::timestamptz + interval '10 minutes',
                v_prev_month::timestamptz + interval '5 minutes', v_prev_month::timestamptz + interval '5 minutes',
                '00', '00', 'Giao dich thanh cong', FALSE, 1, 0, v_created)
        RETURNING id INTO v_payment_id;

        SELECT commission_rate INTO v_rate FROM provider_profiles WHERE id = v_provider2_id;
        INSERT INTO provider_revenues (provider_profile_id, booking_id, payment_id, revenue_period,
                                       completed_date, gross_amount, refund_amount, commission_amount,
                                       commission_rate, adjustment_amount, voucher_discount, voucher_scope,
                                       provider_net_amount, status, deferred_reason, settlement_id,
                                       eligible_at, settled_at, created_at, updated_at)
        VALUES (v_provider2_id, v_booking_id, v_payment_id, to_char(v_prev_month, 'YYYY-MM'), v_prev_month,
                v_total, 0, round(v_total * v_rate, 2), v_rate, 0, 0, NULL,
                round(v_total * (1 - v_rate), 2), 'ELIGIBLE', NULL, NULL,
                (v_prev_month + 1)::timestamptz + interval '16 hours', NULL, v_created, v_created);
    ELSE
        RAISE NOTICE 'Bỏ qua JGSAMPLE02 — chưa có tour Hội An (chạy 02/03 trước).';
    END IF;

    -- ── 3. JGSAMPLE03 — CONFIRMED (đã thanh toán, chờ trải nghiệm) ───────────
    SELECT t.tour_id, pp.id INTO v_tour_id, v_provider1_id
    FROM tours t
    JOIN users u ON u.id = t.created_by
    JOIN provider_profiles pp ON pp.user_id = u.id
    WHERE t.title LIKE 'Xưởng mì%' OR t.title LIKE '%mì Cần Thơ%'
    ORDER BY t.tour_id LIMIT 1;

    IF v_tour_id IS NOT NULL THEN
        v_total := 675000;
        INSERT INTO bookings (booking_code, tourist_id, tour_id, experience_date, total_amount,
                              discount_amount, currency, status, created_at, payment_deadline,
                              paid_at, confirmed_at, slot_count, updated_at)
        VALUES ('JGSAMPLE03', v_tourist1_id, v_tour_id, v_today + 3, v_total, 0, 'VND',
                'CONFIRMED', v_created - interval '1 hour', v_created + interval '9 minutes',
                v_created - interval '1 hour', v_created - interval '1 hour', 1, v_created)
        RETURNING id INTO v_booking_id;

        INSERT INTO booking_passengers (booking_id, full_name, birth_date, gender, email, guest_type,
                                        price, counts_toward_slot, is_booking_customer, linked_user_id,
                                        status, created_at, updated_at)
        VALUES (v_booking_id, 'Nguyễn Văn A', '1988-05-12', 'MALE', 'tourist1@journeygo.com', 'ADULT',
                450000, TRUE, TRUE, v_tourist1_id, 'ACTIVE', v_created, v_created),
               (v_booking_id, 'Nguyễn Minh Quân', '2016-04-18', 'MALE', NULL, 'CHILD',
                225000, TRUE, FALSE, NULL, 'ACTIVE', v_created, v_created);

        INSERT INTO tour_slots (tour_id, slot_date, capacity, booked_count, status, created_at, max_guests_per_slot)
        VALUES (v_tour_id, v_today + 3, 30, 1, 'OPEN', v_created, 30)
        ON CONFLICT DO NOTHING;
        SELECT id INTO v_slot_id FROM tour_slots WHERE tour_id = v_tour_id AND slot_date = v_today + 3 LIMIT 1;
        IF v_slot_id IS NOT NULL THEN
            INSERT INTO booking_slot_holds (booking_id, tour_slot_id, slot_type, slot_date, slot_count, released, held_at)
            VALUES (v_booking_id, v_slot_id, 'TOUR', v_today + 3, 1, FALSE, v_created);
        END IF;

        INSERT INTO payments (booking_id, txn_ref, vnp_transaction_no, bank_code, card_type, method, status,
                              amount, currency, created_at, expires_at, paid_at, resolved_at, vnp_response_code,
                              vnp_transaction_status, vnp_message, duplicate_payment, ipn_count, query_count, updated_at)
        VALUES (v_booking_id, 'JGSAMPLE03-TXN', '91000003', 'VNPAYQR', 'QRCODE', 'VNPAY', 'SUCCESS',
                v_total, 'VND', v_created - interval '1 hour', v_created + interval '9 minutes',
                v_created - interval '1 hour', v_created - interval '1 hour',
                '00', '00', 'Giao dich thanh cong', FALSE, 1, 0, v_created)
        RETURNING id INTO v_payment_id;

        -- Chưa hoàn thành trải nghiệm ⇒ PENDING (chặn tất toán)
        SELECT commission_rate INTO v_rate FROM provider_profiles WHERE id = v_provider1_id;
        INSERT INTO provider_revenues (provider_profile_id, booking_id, payment_id, revenue_period,
                                       completed_date, gross_amount, refund_amount, commission_amount,
                                       commission_rate, adjustment_amount, voucher_discount, voucher_scope,
                                       provider_net_amount, status, deferred_reason, settlement_id,
                                       eligible_at, settled_at, created_at, updated_at)
        VALUES (v_provider1_id, v_booking_id, v_payment_id, to_char(v_today + 3, 'YYYY-MM'), v_today + 3,
                v_total, 0, 0, v_rate, 0, 0, NULL, 0,
                'PENDING', 'BOOKING_NOT_COMPLETED', NULL, NULL, NULL, v_created, v_created);
    END IF;

    -- ── 4. JGSAMPLE04 — PENDING_PAYMENT (tự EXPIRED sau 10 phút) ────────────
    SELECT t.tour_id INTO v_tour_id FROM tours t
    WHERE t.title LIKE 'Phố cổ Hội An%' LIMIT 1;

    IF v_tour_id IS NOT NULL THEN
        v_total := 350000;
        INSERT INTO bookings (booking_code, tourist_id, tour_id, experience_date, total_amount,
                              discount_amount, currency, status, created_at, payment_deadline, slot_count, updated_at)
        VALUES ('JGSAMPLE04', v_tourist2_id, v_tour_id, v_today + 4, v_total, 0, 'VND',
                'PENDING_PAYMENT', v_created, v_created + interval '10 minutes', 1, v_created)
        RETURNING id INTO v_booking_id;

        INSERT INTO booking_passengers (booking_id, full_name, birth_date, gender, email, guest_type,
                                        price, counts_toward_slot, is_booking_customer, linked_user_id,
                                        status, created_at, updated_at)
        VALUES (v_booking_id, 'Nguyễn Văn B', '1985-02-20', 'MALE', 'tourist2@journeygo.com', 'ADULT',
                v_total, TRUE, TRUE, v_tourist2_id, 'ACTIVE', v_created, v_created);

        INSERT INTO tour_slots (tour_id, slot_date, capacity, booked_count, status, created_at, max_guests_per_slot)
        VALUES (v_tour_id, v_today + 4, 30, 1, 'OPEN', v_created, 30)
        ON CONFLICT DO NOTHING;
        SELECT id INTO v_slot_id FROM tour_slots WHERE tour_id = v_tour_id AND slot_date = v_today + 4 LIMIT 1;
        IF v_slot_id IS NOT NULL THEN
            INSERT INTO booking_slot_holds (booking_id, tour_slot_id, slot_type, slot_date, slot_count, released, held_at)
            VALUES (v_booking_id, v_slot_id, 'TOUR', v_today + 4, 1, FALSE, v_created);
        END IF;
    END IF;

    -- ── 5. JGSAMPLE05 — CANCELLED ───────────────────────────────────────────
    SELECT t.tour_id INTO v_tour_id FROM tours t
    WHERE t.title LIKE 'Bến Ninh Kiều%' OR t.title LIKE '%nhà cổ Bình Thủy%'
    ORDER BY t.tour_id LIMIT 1;

    IF v_tour_id IS NOT NULL THEN
        v_total := 350000;
        INSERT INTO bookings (booking_code, tourist_id, tour_id, experience_date, total_amount,
                              discount_amount, currency, status, created_at, payment_deadline,
                              cancellation_reason, slot_count, updated_at)
        VALUES ('JGSAMPLE05', v_tourist1_id, v_tour_id, v_today + 5, v_total, 0, 'VND',
                'CANCELLED', v_created, v_created + interval '10 minutes',
                'Không thể đi được do thời tiết xấu', 1, v_created)
        RETURNING id INTO v_booking_id;

        INSERT INTO booking_passengers (booking_id, full_name, birth_date, gender, email, guest_type,
                                        price, counts_toward_slot, is_booking_customer, linked_user_id,
                                        status, created_at, updated_at)
        VALUES (v_booking_id, 'Nguyễn Văn A', '1988-05-12', 'MALE', 'tourist1@journeygo.com', 'ADULT',
                v_total, TRUE, TRUE, v_tourist1_id, 'ACTIVE', v_created, v_created);

        -- Slot đã được giữ rồi trả lại (released = TRUE, booked_count không tăng)
        INSERT INTO tour_slots (tour_id, slot_date, capacity, booked_count, status, created_at, max_guests_per_slot)
        VALUES (v_tour_id, v_today + 5, 30, 0, 'OPEN', v_created, 30)
        ON CONFLICT DO NOTHING;
        SELECT id INTO v_slot_id FROM tour_slots WHERE tour_id = v_tour_id AND slot_date = v_today + 5 LIMIT 1;
        IF v_slot_id IS NOT NULL THEN
            INSERT INTO booking_slot_holds (booking_id, tour_slot_id, slot_type, slot_date, slot_count, released, held_at, released_at)
            VALUES (v_booking_id, v_slot_id, 'TOUR', v_today + 5, 1, TRUE, v_created, v_created);
        END IF;
    END IF;

    -- ── 6. JGSAMPLE06 — COMPLETED, kỳ 3 tháng trước ─────────────────────────
    SELECT t.tour_id, pp.id INTO v_tour_id, v_provider1_id
    FROM tours t
    JOIN users u ON u.id = t.created_by
    JOIN provider_profiles pp ON pp.user_id = u.id
    WHERE t.title LIKE '%Bình Thủy%' ORDER BY t.tour_id LIMIT 1;

    IF v_tour_id IS NOT NULL THEN
        v_total := 700000;
        INSERT INTO bookings (booking_code, tourist_id, tour_id, experience_date, total_amount,
                              discount_amount, currency, status, created_at, payment_deadline,
                              paid_at, confirmed_at, completed_at, slot_count, updated_at)
        VALUES ('JGSAMPLE06', v_tourist2_id, v_tour_id, v_prev3_month, v_total, 0, 'VND',
                'COMPLETED', v_prev3_month::timestamptz, v_prev3_month::timestamptz + interval '10 minutes',
                v_prev3_month::timestamptz + interval '5 minutes',
                v_prev3_month::timestamptz + interval '5 minutes',
                (v_prev3_month + 1)::timestamptz + interval '15 hours', 2, v_created)
        RETURNING id INTO v_booking_id;

        INSERT INTO booking_passengers (booking_id, full_name, birth_date, gender, email, guest_type,
                                        price, counts_toward_slot, is_booking_customer, linked_user_id,
                                        status, created_at, updated_at)
        VALUES (v_booking_id, 'Nguyễn Văn B', '1985-02-20', 'MALE', 'tourist2@journeygo.com', 'ADULT',
                350000, TRUE, TRUE, v_tourist2_id, 'ACTIVE', v_created, v_created),
               (v_booking_id, 'Lê Thị C', '1987-11-08', 'FEMALE', 'tourist2@journeygo.com', 'ADULT',
                350000, TRUE, FALSE, NULL, 'ACTIVE', v_created, v_created);

        INSERT INTO tour_slots (tour_id, slot_date, capacity, booked_count, status, created_at, max_guests_per_slot)
        VALUES (v_tour_id, v_prev3_month, 30, 2, 'OPEN', v_created, 30)
        ON CONFLICT DO NOTHING;
        SELECT id INTO v_slot_id FROM tour_slots WHERE tour_id = v_tour_id AND slot_date = v_prev3_month LIMIT 1;
        IF v_slot_id IS NOT NULL THEN
            INSERT INTO booking_slot_holds (booking_id, tour_slot_id, slot_type, slot_date, slot_count, released, held_at)
            VALUES (v_booking_id, v_slot_id, 'TOUR', v_prev3_month, 2, FALSE, v_created);
        END IF;

        INSERT INTO payments (booking_id, txn_ref, vnp_transaction_no, bank_code, card_type, method, status,
                              amount, currency, created_at, expires_at, paid_at, resolved_at, vnp_response_code,
                              vnp_transaction_status, vnp_message, duplicate_payment, ipn_count, query_count, updated_at)
        VALUES (v_booking_id, 'JGSAMPLE06-TXN', '91000006', NULL, NULL, 'VNPAY', 'SUCCESS',
                v_total, 'VND', v_prev3_month::timestamptz, v_prev3_month::timestamptz + interval '10 minutes',
                v_prev3_month::timestamptz + interval '5 minutes', v_prev3_month::timestamptz + interval '5 minutes',
                '00', '00', 'Giao dich thanh cong', FALSE, 1, 0, v_created)
        RETURNING id INTO v_payment_id;

        SELECT commission_rate INTO v_rate FROM provider_profiles WHERE id = v_provider1_id;
        INSERT INTO provider_revenues (provider_profile_id, booking_id, payment_id, revenue_period,
                                       completed_date, gross_amount, refund_amount, commission_amount,
                                       commission_rate, adjustment_amount, voucher_discount, voucher_scope,
                                       provider_net_amount, status, deferred_reason, settlement_id,
                                       eligible_at, settled_at, created_at, updated_at)
        VALUES (v_provider1_id, v_booking_id, v_payment_id, to_char(v_prev3_month, 'YYYY-MM'), v_prev3_month,
                v_total, 0, round(v_total * v_rate, 2), v_rate, 0, 0, NULL,
                round(v_total * (1 - v_rate), 2), 'ELIGIBLE', NULL, NULL,
                (v_prev3_month + 1)::timestamptz + interval '15 hours', NULL, v_created, v_created);
    END IF;

    -- ── 7. JGSAMPLE07 — COMPLETED + Refund đã hoàn thành 50% ─────────────────
    SELECT t.tour_id, pp.id INTO v_tour_id, v_provider2_id
    FROM tours t
    JOIN users u ON u.id = t.created_by
    JOIN provider_profiles pp ON pp.user_id = u.id
    WHERE t.title LIKE 'Phố cổ Hội An%' LIMIT 1;

    IF v_tour_id IS NOT NULL THEN
        v_total := 350000;
        v_refund_amount := round(v_total * 0.5, 2);
        INSERT INTO bookings (booking_code, tourist_id, tour_id, experience_date, total_amount,
                              discount_amount, currency, status, created_at, payment_deadline,
                              paid_at, confirmed_at, completed_at, slot_count, updated_at)
        VALUES ('JGSAMPLE07', v_tourist1_id, v_tour_id, v_prev_month, v_total, 0, 'VND',
                'COMPLETED', v_prev_month::timestamptz, v_prev_month::timestamptz + interval '10 minutes',
                v_prev_month::timestamptz + interval '5 minutes',
                v_prev_month::timestamptz + interval '5 minutes',
                (v_prev_month + 1)::timestamptz + interval '16 hours', 1, v_created)
        RETURNING id INTO v_booking_id;

        INSERT INTO booking_passengers (booking_id, full_name, birth_date, gender, email, guest_type,
                                        price, counts_toward_slot, is_booking_customer, linked_user_id,
                                        status, created_at, updated_at)
        VALUES (v_booking_id, 'Nguyễn Văn A', '1988-05-12', 'MALE', 'tourist1@journeygo.com', 'ADULT',
                v_total, TRUE, TRUE, v_tourist1_id, 'ACTIVE', v_created, v_created);

        INSERT INTO tour_slots (tour_id, slot_date, capacity, booked_count, status, created_at, max_guests_per_slot)
        VALUES (v_tour_id, v_prev_month, 30, 1, 'OPEN', v_created, 30)
        ON CONFLICT DO NOTHING;
        SELECT id INTO v_slot_id FROM tour_slots WHERE tour_id = v_tour_id AND slot_date = v_prev_month LIMIT 1;
        IF v_slot_id IS NOT NULL THEN
            INSERT INTO booking_slot_holds (booking_id, tour_slot_id, slot_type, slot_date, slot_count, released, held_at)
            VALUES (v_booking_id, v_slot_id, 'TOUR', v_prev_month, 1, FALSE, v_created);
        END IF;

        INSERT INTO payments (booking_id, txn_ref, vnp_transaction_no, bank_code, card_type, method, status,
                              amount, currency, created_at, expires_at, paid_at, resolved_at, vnp_response_code,
                              vnp_transaction_status, vnp_message, duplicate_payment, ipn_count, query_count, updated_at)
        VALUES (v_booking_id, 'JGSAMPLE07-TXN', '91000007', 'MOMO', 'QRCODE', 'VNPAY', 'SUCCESS',
                v_total, 'VND', v_prev_month::timestamptz, v_prev_month::timestamptz + interval '10 minutes',
                v_prev_month::timestamptz + interval '5 minutes', v_prev_month::timestamptz + interval '5 minutes',
                '00', '00', 'Giao dich thanh cong', FALSE, 1, 0, v_created)
        RETURNING id INTO v_payment_id;

        -- Refund đã hoàn thành
        INSERT INTO refund_requests (refund_code, payment_id, tourist_id, status, declared_reason,
                                     approved_reason, reason_summary, proposed_amount, approved_amount,
                                     refunded_amount, currency, method, reviewed_by, reviewed_at,
                                     bank_account_number, bank_account_name, bank_name, transfer_reference,
                                     transfer_evidence, transferred_at, created_at, updated_at)
        VALUES ('JGSAMPLERF01', v_payment_id, v_tourist1_id, 'REFUNDED', 'PERSONAL', 'PERSONAL',
                'Khách không thể đi được do thời tiết xấu, đề nghị hoàn một phần',
                v_refund_amount, v_refund_amount, v_refund_amount, 'VND', 'MANUAL_BANK_TRANSFER',
                v_admin_id, (v_prev_month + 1)::timestamptz + interval '16 hours',
                '0123456789', 'NGUYEN VAN A', 'MB Bank', 'FT20261120001',
                'https://img.journeygo.com/refund/ft-20261120001.png',
                (v_prev_month + 1)::timestamptz + interval '16 hours',
                (v_prev_month + 1)::timestamptz + interval '16 hours', v_created);

        SELECT commission_rate INTO v_rate FROM provider_profiles WHERE id = v_provider2_id;
        INSERT INTO provider_revenues (provider_profile_id, booking_id, payment_id, revenue_period,
                                       completed_date, gross_amount, refund_amount, commission_amount,
                                       commission_rate, adjustment_amount, voucher_discount, voucher_scope,
                                       provider_net_amount, status, deferred_reason, settlement_id,
                                       eligible_at, settled_at, created_at, updated_at)
        VALUES (v_provider2_id, v_booking_id, v_payment_id, to_char(v_prev_month, 'YYYY-MM'), v_prev_month,
                v_total, v_refund_amount, round((v_total - v_refund_amount) * v_rate, 2), v_rate, 0, 0, NULL,
                round((v_total - v_refund_amount) * (1 - v_rate), 2), 'ELIGIBLE', NULL, NULL,
                (v_prev_month + 1)::timestamptz + interval '16 hours', NULL, v_created, v_created);
    END IF;

    -- ── 8. JGSAMPLE08 — COMPLETED + Refund đang chờ duyệt ────────────────────
    SELECT t.tour_id, pp.id INTO v_tour_id, v_provider1_id
    FROM tours t
    JOIN users u ON u.id = t.created_by
    JOIN provider_profiles pp ON pp.user_id = u.id
    WHERE t.title LIKE '%Bình Thủy%' ORDER BY t.tour_id LIMIT 1;

    IF v_tour_id IS NOT NULL THEN
        v_total := 350000;
        v_refund_amount := round(v_total * 0.5, 2);
        INSERT INTO bookings (booking_code, tourist_id, tour_id, experience_date, total_amount,
                              discount_amount, currency, status, created_at, payment_deadline,
                              paid_at, confirmed_at, completed_at, slot_count, updated_at)
        VALUES ('JGSAMPLE08', v_tourist2_id, v_tour_id, v_prev_month, v_total, 0, 'VND',
                'COMPLETED', v_prev_month::timestamptz, v_prev_month::timestamptz + interval '10 minutes',
                v_prev_month::timestamptz + interval '5 minutes',
                v_prev_month::timestamptz + interval '5 minutes',
                (v_prev_month + 1)::timestamptz + interval '16 hours', 1, v_created)
        RETURNING id INTO v_booking_id;

        INSERT INTO booking_passengers (booking_id, full_name, birth_date, gender, email, guest_type,
                                        price, counts_toward_slot, is_booking_customer, linked_user_id,
                                        status, created_at, updated_at)
        VALUES (v_booking_id, 'Nguyễn Văn B', '1985-02-20', 'MALE', 'tourist2@journeygo.com', 'ADULT',
                v_total, TRUE, TRUE, v_tourist2_id, 'ACTIVE', v_created, v_created);

        INSERT INTO tour_slots (tour_id, slot_date, capacity, booked_count, status, created_at, max_guests_per_slot)
        VALUES (v_tour_id, v_prev_month, 30, 1, 'OPEN', v_created, 30)
        ON CONFLICT DO NOTHING;
        SELECT id INTO v_slot_id FROM tour_slots WHERE tour_id = v_tour_id AND slot_date = v_prev_month LIMIT 1;
        IF v_slot_id IS NOT NULL THEN
            INSERT INTO booking_slot_holds (booking_id, tour_slot_id, slot_type, slot_date, slot_count, released, held_at)
            VALUES (v_booking_id, v_slot_id, 'TOUR', v_prev_month, 1, FALSE, v_created);
        END IF;

        INSERT INTO payments (booking_id, txn_ref, vnp_transaction_no, bank_code, card_type, method, status,
                              amount, currency, created_at, expires_at, paid_at, resolved_at, vnp_response_code,
                              vnp_transaction_status, vnp_message, duplicate_payment, ipn_count, query_count, updated_at)
        VALUES (v_booking_id, 'JGSAMPLE08-TXN', '91000008', 'VNBANK', 'ATM', 'VNPAY', 'SUCCESS',
                v_total, 'VND', v_prev_month::timestamptz, v_prev_month::timestamptz + interval '10 minutes',
                v_prev_month::timestamptz + interval '5 minutes', v_prev_month::timestamptz + interval '5 minutes',
                '00', '00', 'Giao dich thanh cong', FALSE, 1, 0, v_created)
        RETURNING id INTO v_payment_id;

        -- Refund CHỜ DUYỆT ⇒ khoản doanh thu bị giữ lại (PENDING)
        INSERT INTO refund_requests (refund_code, payment_id, tourist_id, status, declared_reason,
                                     reason_summary, proposed_amount, currency, method, created_at, updated_at)
        VALUES ('JGSAMPLERF02', v_payment_id, v_tourist2_id, 'PENDING_REVIEW', 'PERSONAL',
                'Điểm đến tạm đóng cửa do bảo trì, khách đề nghị hoàn một phần',
                v_refund_amount, 'VND', 'MANUAL_BANK_TRANSFER', v_created, v_created);

        SELECT commission_rate INTO v_rate FROM provider_profiles WHERE id = v_provider1_id;
        INSERT INTO provider_revenues (provider_profile_id, booking_id, payment_id, revenue_period,
                                       completed_date, gross_amount, refund_amount, commission_amount,
                                       commission_rate, adjustment_amount, voucher_discount, voucher_scope,
                                       provider_net_amount, status, deferred_reason, settlement_id,
                                       eligible_at, settled_at, created_at, updated_at)
        VALUES (v_provider1_id, v_booking_id, v_payment_id, to_char(v_prev_month, 'YYYY-MM'), v_prev_month,
                v_total, 0, 0, v_rate, 0, 0, NULL, 0,
                'PENDING', 'REFUND_PENDING', NULL, NULL, NULL, v_created, v_created);
    END IF;

    -- ── 9. JGSAMPLE09 — COMPLETED, chưa có refund ───────────────────────────
    SELECT t.tour_id, pp.id INTO v_tour_id, v_provider1_id
    FROM tours t
    JOIN users u ON u.id = t.created_by
    JOIN provider_profiles pp ON pp.user_id = u.id
    WHERE t.title LIKE '%Cái Răng%' ORDER BY t.tour_id LIMIT 1;

    IF v_tour_id IS NOT NULL THEN
        v_total := 350000;
        INSERT INTO bookings (booking_code, tourist_id, tour_id, experience_date, total_amount,
                              discount_amount, currency, status, created_at, payment_deadline,
                              paid_at, confirmed_at, completed_at, slot_count, updated_at)
        VALUES ('JGSAMPLE09', v_tourist2_id, v_tour_id, v_prev_month, v_total, 0, 'VND',
                'COMPLETED', v_prev_month::timestamptz, v_prev_month::timestamptz + interval '10 minutes',
                v_prev_month::timestamptz + interval '5 minutes',
                v_prev_month::timestamptz + interval '5 minutes',
                (v_prev_month + 1)::timestamptz + interval '16 hours', 1, v_created)
        RETURNING id INTO v_booking_id;

        INSERT INTO booking_passengers (booking_id, full_name, birth_date, gender, email, guest_type,
                                        price, counts_toward_slot, is_booking_customer, linked_user_id,
                                        status, created_at, updated_at)
        VALUES (v_booking_id, 'Nguyễn Văn B', '1985-02-20', 'MALE', 'tourist2@journeygo.com', 'ADULT',
                v_total, TRUE, TRUE, v_tourist2_id, 'ACTIVE', v_created, v_created);

        INSERT INTO tour_slots (tour_id, slot_date, capacity, booked_count, status, created_at, max_guests_per_slot)
        VALUES (v_tour_id, v_prev_month, 30, 1, 'OPEN', v_created, 30)
        ON CONFLICT DO NOTHING;
        SELECT id INTO v_slot_id FROM tour_slots WHERE tour_id = v_tour_id AND slot_date = v_prev_month LIMIT 1;
        IF v_slot_id IS NOT NULL THEN
            INSERT INTO booking_slot_holds (booking_id, tour_slot_id, slot_type, slot_date, slot_count, released, held_at)
            VALUES (v_booking_id, v_slot_id, 'TOUR', v_prev_month, 1, FALSE, v_created);
        END IF;

        INSERT INTO payments (booking_id, txn_ref, vnp_transaction_no, bank_code, card_type, method, status,
                              amount, currency, created_at, expires_at, paid_at, resolved_at, vnp_response_code,
                              vnp_transaction_status, vnp_message, duplicate_payment, ipn_count, query_count, updated_at)
        VALUES (v_booking_id, 'JGSAMPLE09-TXN', '91000009', 'VNPAY', 'QRCODE', 'VNPAY', 'SUCCESS',
                v_total, 'VND', v_prev_month::timestamptz, v_prev_month::timestamptz + interval '10 minutes',
                v_prev_month::timestamptz + interval '5 minutes', v_prev_month::timestamptz + interval '5 minutes',
                '00', '00', 'Giao dich thanh cong', FALSE, 1, 0, v_created)
        RETURNING id INTO v_payment_id;

        SELECT commission_rate INTO v_rate FROM provider_profiles WHERE id = v_provider1_id;
        INSERT INTO provider_revenues (provider_profile_id, booking_id, payment_id, revenue_period,
                                       completed_date, gross_amount, refund_amount, commission_amount,
                                       commission_rate, adjustment_amount, voucher_discount, voucher_scope,
                                       provider_net_amount, status, deferred_reason, settlement_id,
                                       eligible_at, settled_at, created_at, updated_at)
        VALUES (v_provider1_id, v_booking_id, v_payment_id, to_char(v_prev_month, 'YYYY-MM'), v_prev_month,
                v_total, 0, round(v_total * v_rate, 2), v_rate, 0, 0, NULL,
                round(v_total * (1 - v_rate), 2), 'ELIGIBLE', NULL, NULL,
                (v_prev_month + 1)::timestamptz + interval '16 hours', NULL, v_created, v_created);
    END IF;

    RAISE NOTICE 'Seed giao dịch mẫu hoàn tất.';
END $seed$;
