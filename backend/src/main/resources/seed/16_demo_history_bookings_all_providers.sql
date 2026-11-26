-- =====================================================================================
--  16_demo_history_bookings_all_providers.sql
--  LỊCH SỬ BOOKING 2024–2026 CHO TẤT CẢ ĐỐI TÁC (JourneyGo History Demo)
-- =====================================================================================
--  Mục đích
--    Bổ sung lịch sử giao dịch cho CÁC ĐỐI TÁC CÒN LẠI (ngoài provider@journeygo.com
--    đã có 21.000 booking từ script 12/13/14) — để biểu đồ "Tất cả" của từng đối tác
--    có dữ liệu rải rác đều năm 2024 → 2026, và để mỗi đối tác có doanh thu
--    đủ điều kiện tất toán theo chu kỳ 10 ngày.
--
--  ⚠️ AN TOÀN (giữ nguyên quy ước của script 12/13/14)
--    * KHÔNG INSERT settlement ở trạng thái PAID/COMPLETED — settlement chỉ tạo
--      qua API chính thức của Admin (script 19 / 22).
--    * Không DELETE / TRUNCATE bất kỳ bảng nào.
--    * Không có voucher ⇒ discount_amount = 0, voucher_scope = NULL
--      ⇒ công thức tài chính khớp 100% với ProviderRevenue#recalculate.
--    * Mỗi booking kèm đủ: booking_passengers + booking_slot_holds + payments
--      (VNPAY SUCCESS) + provider_revenues (ELIGIBLE).
--
--  IDEMPOTENT
--    Mã booking `JGPBxxxxxx` — nếu đã tồn tại ⇒ bỏ qua.
--
--  Cách chạy:
--    docker cp 16_demo_history_bookings_all_providers.sql journeygo-postgres:/tmp/
--    docker exec journeygo-postgres psql -U journeygo -d journeygo_db \
--        -v ON_ERROR_STOP=1 -f /tmp/16_demo_history_bookings_all_providers.sql
-- =====================================================================================

\set ON_ERROR_STOP on

DO $guard$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@journeygo.com') THEN
        RAISE EXCEPTION 'Không tìm thấy admin@journeygo.com — dừng lại để an toàn.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM users WHERE email LIKE 'demo.tourist%@demo.journeygo.local') THEN
        RAISE EXCEPTION 'Chưa có tài khoản Tourist demo — hãy chạy 10_demo_history_common.sql trước.';
    END IF;
END
$guard$;

-- ═══════════════════════════════════════════════════════════════════════════
--  0. BƯỚC 1 — MỞ RỘNG LỊCH KHỞI HÀNH 2024-01 → 2026-12 CHO TẤT CẢ ĐỐI TÁC
-- ═══════════════════════════════════════════════════════════════════════════
--  Script 11 chỉ tạo slot cho `created_by = 4`. Các đối tác còn lại có slot từ
--  2026-01 trở đi ⇒ thiếu lịch sử 2024–2025. Bước này tạo slot + departure date
--  cho MỌI tour đã duyệt (có đủ 4 loại giá) của các đối tác còn lại.
--
--  ⚠️ `status` phải là giá trị của enum `TourSlotStatus` (OPEN | CLOSED).
DO $slots$
DECLARE
    v_tours   record;
    v_month   date;
    v_day     int;
    v_dates   int[];
    v_slot    date;
    v_start   date := DATE '2024-01-01';
    v_end     date := DATE '2026-12-31';
    v_cap     int;
    v_created int := 0;
BEGIN
    FOR v_tours IN
        SELECT t.tour_id, COALESCE(t.max_guests_per_slot, 20) AS cap
        FROM tours t
        WHERE t.created_by <> 4
          AND t.deleted = false
          AND t.tour_format IS NOT NULL
          AND t.status = 'PUBLISHED'
          AND EXISTS (SELECT 1 FROM tour_prices tp
                      WHERE tp.tour_id = t.tour_id AND tp.guest_type = 'ADULT')
          AND EXISTS (SELECT 1 FROM tour_prices tp
                      WHERE tp.tour_id = t.tour_id AND tp.guest_type = 'CHILD')
          AND EXISTS (SELECT 1 FROM tour_prices tp
                      WHERE tp.tour_id = t.tour_id AND tp.guest_type = 'TODDLER')
    LOOP
        v_cap := GREATEST(v_tours.cap, 10);
        v_month := date_trunc('month', v_start)::date;
        WHILE v_month <= v_end LOOP
            -- 8 ngày khởi hành mỗi tháng (thứ 2, 5, 9, 13, 17, 21, 25, 28).
            v_dates := ARRAY[2, 5, 9, 13, 17, 21, 25, 28];
            FOREACH v_day IN ARRAY v_dates LOOP
                v_slot := (v_month + (v_day - 1))::date;
                IF v_slot < v_start OR v_slot > v_end THEN
                    CONTINUE;
                END IF;

                IF NOT EXISTS (SELECT 1 FROM tour_slots
                               WHERE tour_id = v_tours.tour_id AND slot_date = v_slot) THEN
                    INSERT INTO tour_slots (tour_id, slot_date, capacity, booked_count, status, created_at)
                    VALUES (v_tours.tour_id, v_slot, v_cap, 0, 'OPEN', now());
                    v_created := v_created + 1;
                END IF;

                IF NOT EXISTS (SELECT 1 FROM tour_departure_dates
                               WHERE tour_id = v_tours.tour_id AND departure_date = v_slot) THEN
                    INSERT INTO tour_departure_dates (tour_id, departure_date)
                    VALUES (v_tours.tour_id, v_slot);
                END IF;
            END LOOP;
            v_month := (v_month + interval '1 month')::date;
        END LOOP;
    END LOOP;

    RAISE NOTICE '[Seed 16] Đã tạo % tour_slots lịch sử cho các đối tác còn lại.', v_created;
END
$slots$;

-- ═══════════════════════════════════════════════════════════════════════════
--  1. SINH BOOKING CHO TỪNG ĐỐI TÁC CÒN LẠI
-- ═══════════════════════════════════════════════════════════════════════════
--  Mỗi đối tác nhận ~1.500 booking rải đều 2024-01 → 2026-11 (≈ 6 booking/tháng),
--  theo đúng hệ số mùa/như script 12 ⇒ biểu đồ "Tất cả" có dữ liệu liên tục.
DO $seed$
DECLARE
    c_seed_tag      text   := 'JGHP2024_2026';
    c_code_prefix   text   := 'JGPB';
    c_target        int    := 1500;          -- booking mỗi đối tác
    c_rate          numeric := 0.2000;

    v_prof          record;
    v_slots         record;
    v_total_slots   int;
    v_capacity_sum  bigint;
    v_weight_sum    numeric;
    v_prev_cum      numeric := 0;
    v_created       int := 0;
    v_seq           int := 0;

    v_slot_cap      int;
    v_used          int;
    v_guests        int;
    v_exp_date      date;
    v_tourist_id    bigint;
    v_booking_id    bigint;
    v_payment_id    bigint;
    v_booking_code  varchar(32);
    v_txn_seq       int;
    v_total         numeric(14,2);
    v_created_at    timestamptz;
    v_paid_at       timestamptz;
    v_completed_at  timestamptz;
    v_base_price    numeric;
    v_child_price   numeric;
    v_toddler_price numeric;
    v_commission    numeric(14,2);
    v_provider_net  numeric(14,2);
    v_tourists      bigint[];
    v_cnt           int;
BEGIN
    SELECT array_agg(id ORDER BY id) INTO v_tourists
    FROM users
    WHERE email LIKE 'demo.tourist%@demo.journeygo.local';

    IF v_tourists IS NULL THEN
        RAISE EXCEPTION 'Chưa có tài khoản Tourist demo.';
    END IF;

    -- Lặp qua từng ProviderProfile còn lại (bỏ qua profile 1 — đã có dữ liệu).
    FOR v_prof IN
        SELECT pp.id AS profile_id, pp.user_id
        FROM provider_profiles pp
        WHERE pp.id <> 1
        ORDER BY pp.id
    LOOP
        v_created := 0;
        v_seq := 0;
        v_prev_cum := 0;

        -- Tour hợp lệ của đối tác này (có đủ ADULT/CHILD/TODDLER).
        -- ⚠️ DROP trước: temp table của vòng lặp trước vẫn còn (ON COMMIT DROP
        --    chỉ xảy ra khi COMMIT, còn toàn bộ khối chạy trong 1 transaction).
        DROP TABLE IF EXISTS tmp_tours_p;
        DROP TABLE IF EXISTS tmp_slots_p;
        CREATE TEMP TABLE tmp_tours_p ON COMMIT DROP AS
        SELECT t.tour_id,
               tp.adult_price,
               tp.child_price,
               tp.toddler_price
        FROM tours t
        JOIN LATERAL (
            SELECT max(price) FILTER (WHERE guest_type = 'ADULT')   AS adult_price,
                   max(price) FILTER (WHERE guest_type = 'CHILD')   AS child_price,
                   max(price) FILTER (WHERE guest_type = 'TODDLER') AS toddler_price
            FROM tour_prices WHERE tour_id = t.tour_id
        ) tp ON TRUE
        WHERE t.created_by = v_prof.user_id
          AND t.deleted = false
          AND t.tour_format IS NOT NULL
          AND t.status = 'PUBLISHED'
          AND tp.adult_price IS NOT NULL
          AND tp.child_price IS NOT NULL
          AND tp.toddler_price IS NOT NULL;

        GET DIAGNOSTICS v_cnt = ROW_COUNT;
        IF v_cnt = 0 THEN
            RAISE NOTICE '[Seed 16] Profile %: không có tour hợp lệ — bỏ qua.', v_prof.profile_id;
            CONTINUE;
        END IF;

        -- Slot ứng viên 2024-01-01 → 2026-11-30 (không vượt "hôm nay" 26/11/2026).
        CREATE TEMP TABLE tmp_slots_p ON COMMIT DROP AS        SELECT s.id       AS slot_id,
               s.tour_id  AS tour_id,
               s.slot_date AS slot_date,
               s.capacity AS capacity,
               s.booked_count AS booked_count,
               (demo_season_factor(s.slot_date) * demo_year_factor(s.slot_date))::numeric AS weight
        FROM tour_slots s
        JOIN tmp_tours_p t ON t.tour_id = s.tour_id
        WHERE s.slot_date >= DATE '2024-01-01'
          AND s.slot_date <  DATE '2026-12-01';

        GET DIAGNOSTICS v_cnt = ROW_COUNT;
        IF v_cnt = 0 THEN
            RAISE NOTICE '[Seed 16] Profile %: không có slot trong 2024–2026 — bỏ qua.', v_prof.profile_id;
            CONTINUE;
        END IF;

        SELECT count(*), sum(capacity), sum(weight)
          INTO v_total_slots, v_capacity_sum, v_weight_sum
        FROM tmp_slots_p;

        -- ⚠️ BUG ĐÃ SỬA (2026-11-26): trước đây có `IF v_cnt < 1 THEN v_cnt := 1;`
        -- ⇒ đối tác có NHIỀU slot (profile 2: 1.983 slot, profile 3: 3.388 slot) so với
        -- c_target = 1.500 ⇒ phần lớn slot có quota = 0, bị ép lên 1 ⇒ tổng "ứng viên"
        -- vượt xa c_target ⇒ mệnh đề chặn `v_created + v_cnt > c_target` cắt ở các slot
        -- ĐẦU TIÊN (được ORDER BY slot_date) ⇒ toàn bộ booking dồn về đầu timeline,
        -- các tháng phía sau bị TRỐNG ⇒ biểu đồ "Tất cả" thiếu bucket.
        --
        -- Cách sửa: bỏ mặt sàn 1 ⇒ quota có thể = 0 ⇒ tổng luôn = c_target và được
        -- trải đều trên TOÀN BỘ cửa sổ thời gian (nhờ `total_weight` tính sẵn).
        FOR v_slots IN
            SELECT slot_id, tour_id, slot_date, capacity, booked_count,
                   sum(weight) OVER (ORDER BY slot_date, tour_id, slot_id) AS cum_weight,
                   sum(weight) OVER ()                                        AS total_weight
            FROM tmp_slots_p
            ORDER BY slot_date, tour_id, slot_id
        LOOP
            v_cnt := floor(v_slots.cum_weight / v_slots.total_weight * c_target)::int
                   - floor(v_prev_cum / v_slots.total_weight * c_target)::int;
            v_prev_cum := v_slots.cum_weight;

            -- Quota có thể = 0 (nhiều slot, ít booking) ⇒ hợp lệ, KHÔNG ép tối thiểu 1.
            v_slot_cap := v_slots.capacity;
            v_used := COALESCE(v_slots.booked_count, 0);
            IF v_used + v_cnt > v_slot_cap THEN
                v_cnt := GREATEST(v_slot_cap - v_used, 0);
            END IF;

            IF v_created + v_cnt > c_target THEN
                v_cnt := GREATEST(c_target - v_created, 0);
            END IF;

            FOR i IN 1..v_cnt LOOP
                v_seq := v_seq + 1;

                SELECT adult_price, child_price, toddler_price
                  INTO v_base_price, v_child_price, v_toddler_price
                  FROM tmp_tours_p
                 WHERE tour_id = v_slots.tour_id;

                v_guests := 1 + ((v_seq * 7 + v_slots.tour_id) % 3);

                v_total := v_base_price;
                IF v_guests >= 2 THEN
                    v_total := v_total + v_child_price;
                END IF;
                IF v_guests >= 3 THEN
                    v_total := v_total + v_toddler_price;
                END IF;

                -- Ngày tạo = ngày khởi hành − 4 ngày, giờ VN 09:00–17:00.
                v_created_at   := ((v_slots.slot_date - 4)::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')
                                  + (interval '9 hours' + (v_seq % 8) * interval '37 minutes');
                v_paid_at      := v_created_at + interval '6 minutes';
                v_completed_at := ((v_slots.slot_date + 1)::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')
                                  + interval '16 hours';

                -- Mã booking DUY NHẤT toàn hệ thống: JGPB + profile + seq.
                v_booking_code := c_code_prefix || lpad(v_prof.profile_id::text, 2, '0')
                                  || lpad(v_seq::text, 6, '0');
                v_txn_seq := v_prof.profile_id * 1000000 + v_seq;

                v_tourist_id := v_tourists[((v_seq * 13 + v_slots.tour_id)
                                           % array_length(v_tourists, 1)) + 1];

                -- ══ BOOKING ═══════════════════════════════════════════════════
                INSERT INTO bookings (booking_code, tourist_id, tour_id, experience_date,
                                      total_amount, discount_amount, voucher_scope, currency,
                                      status, created_at, payment_deadline, paid_at, confirmed_at,
                                      completed_at, slot_count, updated_at, seed_tag)
                VALUES (v_booking_code, v_tourist_id, v_slots.tour_id, v_slots.slot_date,
                        v_total, 0, NULL, 'VND',
                        'COMPLETED', v_created_at, v_created_at + interval '15 minutes',
                        v_paid_at, v_paid_at, v_completed_at, v_guests, v_created_at, c_seed_tag)
                RETURNING id INTO v_booking_id;

                -- ══ HÀNH KHÁCH ═════════════════════════════════════════════════
                INSERT INTO booking_passengers (booking_id, full_name, birth_date, gender, email,
                                                guest_type, price, counts_toward_slot,
                                                is_booking_customer, linked_user_id, status,
                                                created_at, updated_at)
                SELECT v_booking_id,
                       u.full_name || CASE p.gt WHEN 'ADULT' THEN ''
                                                WHEN 'CHILD' THEN ' (nhỏ)'
                                                ELSE ' (bé)' END,
                       CASE p.gt WHEN 'ADULT' THEN DATE '1993-07-21'
                                 WHEN 'CHILD' THEN DATE '2017-05-11'
                                 ELSE DATE '2021-09-03' END,
                       CASE p.gt WHEN 'CHILD' THEN 'FEMALE' ELSE 'MALE' END,
                       u.email,
                       p.gt,
                       p.price,
                       TRUE,
                       (p.gt = 'ADULT'),
                       u.id,
                       'ACTIVE',
                       v_created_at, v_created_at
                FROM users u
                CROSS JOIN LATERAL (
                    SELECT 'ADULT'   AS gt, v_base_price   AS price
                    UNION ALL SELECT 'CHILD',   v_child_price   WHERE v_guests >= 2
                    UNION ALL SELECT 'TODDLER', v_toddler_price WHERE v_guests >= 3
                ) p
                WHERE u.id = v_tourist_id;

                -- ══ GIỮ CHỖ SLOT ═══════════════════════════════════════════════
                INSERT INTO booking_slot_holds (booking_id, tour_slot_id, slot_type, slot_date,
                                                slot_count, released, held_at)
                VALUES (v_booking_id, v_slots.slot_id, 'TOUR', v_slots.slot_date, v_guests, FALSE, v_created_at);

                -- ══ PAYMENT (VNPAY — SUCCESS) ═══════════════════════════════════
                INSERT INTO payments (booking_id, txn_ref, vnp_transaction_no, vnp_bank_tran_no,
                                      bank_code, card_type, method, status, amount, currency,
                                      created_at, expires_at, paid_at, resolved_at,
                                      vnp_response_code, vnp_transaction_status, vnp_message,
                                      duplicate_payment, ipn_count, query_count, updated_at)
                VALUES (v_booking_id,
                        'JGTX' || v_booking_code,
                        'VNPB' || lpad(v_txn_seq::text, 12, '0'),
                        'BANKB' || lpad(v_txn_seq::text, 12, '0'),
                        'NCB', 'ATM', 'VNPAY', 'SUCCESS',
                        v_total, 'VND',
                        v_created_at, v_created_at + interval '15 minutes', v_paid_at, v_paid_at,
                        '00', '00', 'Giao dich thanh cong',
                        FALSE, 1, 0, v_created_at)
                RETURNING id INTO v_payment_id;

                -- ══ PROVIDER REVENUE (ELIGIBLE — chưa gắn đợt tất toán) ════════
                v_commission   := round(v_total * c_rate, 2);
                v_provider_net := v_total - v_commission;

                INSERT INTO provider_revenues (provider_profile_id, booking_id, payment_id,
                                               revenue_period, completed_date, gross_amount,
                                               refund_amount, commission_amount, commission_rate,
                                               adjustment_amount, voucher_discount, voucher_scope,
                                               provider_net_amount, status, deferred_reason,
                                               settlement_id, eligible_at, settled_at,
                                               created_at, updated_at)
                VALUES (v_prof.profile_id, v_booking_id, v_payment_id,
                        demo_revenue_period(v_slots.slot_date), v_slots.slot_date,
                        v_total, 0, v_commission, c_rate,
                        0, 0, NULL,
                        v_provider_net, 'ELIGIBLE', NULL,
                        NULL, v_completed_at, NULL,
                        v_created_at, v_created_at);

                v_created := v_created + 1;
            END LOOP;
        END LOOP;

        -- Cập nhật booked_count của slot.
        UPDATE tour_slots s
           SET booked_count = COALESCE(agg.cnt, 0)
          FROM (
                SELECT tour_slot_id, sum(slot_count)::int AS cnt
                FROM booking_slot_holds
                WHERE released = false
                  AND tour_slot_id IS NOT NULL
                  AND booking_id IN (SELECT id FROM bookings WHERE seed_tag = c_seed_tag)
                GROUP BY tour_slot_id
          ) agg
         WHERE s.id = agg.tour_slot_id;

        RAISE NOTICE '[Seed 16] Profile %: đã tạo % booking (mục tiêu %).',
                     v_prof.profile_id, v_created, c_target;
    END LOOP;

    RAISE NOTICE '[Seed 16] ✔ Hoàn tất sinh booking cho tất cả đối tác.';
END
$seed$;

-- ═══════════════════════════════════════════════════════════════════════════
--  2. CHECKPOINT
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO demo_seed_checkpoints (script_name, batch_tag, record_count, note)
SELECT '16_demo_history_bookings_all_providers', 'JGHP2024_2026',
       (SELECT count(*) FROM bookings WHERE seed_tag = 'JGHP2024_2026'),
       'Booking lịch sử 2024–2026 cho các đối tác còn lại (COMPLETED + payment SUCCESS '
       '+ provider_revenue ELIGIBLE).'
ON CONFLICT (script_name) DO UPDATE
    SET record_count = EXCLUDED.record_count,
        executed_at  = now(),
        note         = EXCLUDED.note;

\echo '=== Tổng quan mỗi đối tác ==='
SELECT pp.id                                    AS profile_id,
       pp.provider_name,
       count(b.id)                              AS bookings,
       count(DISTINCT to_char(b.paid_at, 'YYYY-MM')) AS months,
       min(to_char(b.paid_at, 'YYYY-MM'))        AS first_month,
       max(to_char(b.paid_at, 'YYYY-MM'))        AS last_month,
       sum(b.total_amount)                      AS gross
FROM provider_profiles pp
LEFT JOIN provider_revenues pr ON pr.provider_profile_id = pp.id
LEFT JOIN bookings b ON b.id = pr.booking_id
GROUP BY 1, 2
ORDER BY 1;
