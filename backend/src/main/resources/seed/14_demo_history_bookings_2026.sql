-- =====================================================================================
--  SEED 14 — LỊCH SỬ BOOKING 2026 (JourneyGo History Demo)
-- =====================================================================================
--  Mục đích
--    Sinh ~4.800 booking cho năm 2026 trên toàn bộ tour wizard của provider@journeygo.com
--    (User ID 4 / ProviderProfile ID 1) — mỗi booking kèm:
--      · booking_passengers   (hành khách)
--      · booking_slot_holds   (giữ chỗ slot)
--      · payments             (VNPAY — SUCCESS, đã thanh toán)
--      · provider_revenues    (khoản doanh thu đủ điều kiện tất toán)
--
--  ⚠️ AN TOÀN
--    * KHÔNG INSERT settlement ở trạng thái PAID/COMPLETED — settlement chỉ tạo
--      qua API của Admin (script 19).
--    * KHÔNG có voucher ⇒ discount_amount = 0, voucher_scope = NULL
--      ⇒ công thức tài chính đơn giản & khớp 100% với ProviderRevenue#recalculate:
--          gross        = total_amount = payment.amount
--          netCollected = gross - refund
--          commission   = round(netCollected * 0.2000, 2)
--          providerNet  = netCollected - commission
--    * Không DELETE / TRUNCATE bất kỳ bảng nào.
--
--  IDEMPOTENT
--    Mã booking `JGH26xxxxxx` — nếu đã tồn tại ⇒ bỏ qua.
--
--  Cách chạy:
--    docker exec -i journeygo-postgres psql -U journeygo -d journeygo_db \
--        -v ON_ERROR_STOP=1 -f - < 14_demo_history_bookings_2026.sql
-- =====================================================================================

\set ON_ERROR_STOP on

DO $guard$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE id = 4 AND email = 'provider@journeygo.com') THEN
        RAISE EXCEPTION 'Khóng tửm thầy provider@journeygo.com - dụng lội dụ an toản.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@journeygo.com') THEN
        RAISE EXCEPTION 'Không tìm thấy admin@journeygo.com — dừng lại để an toàn.';
    END IF;
END
$guard$;

DO $seed$
DECLARE
    -- ═══════════════════════════════════════════════════════════════════════════
    --  CẤU HÌNH
    -- ═══════════════════════════════════════════════════════════════════════════
    c_year            int    := 2026;
    c_target          int    := demo_year_booking_target(2026);   -- 4.800
    c_rate            numeric := 0.2000;
    c_profile_id      bigint := 1;
    c_seed_tag        text   := 'JGHD2024_2026';

    -- Bảng tour hợp lệ (wizard tour của provider 4, có đủ 4 loại giá).
    v_tours           record;

    -- Bảng slot ứng viên (dự án hoá trước để tính nhanh).
    v_slots           record;
    v_slot_ids        bigint[];
    v_slot_dates      date[];
    v_slot_tours      bigint[];
    v_slot_caps       int[];
    v_slot_used       int[];

    -- Tourist pool
    v_tourists        bigint[];

    -- Kết quả
    v_total_slots     int;
    v_capacity_sum    bigint;
    v_weight_sum      numeric;
    v_prev_cum        numeric := 0;
    v_created         int := 0;
    v_skipped         int := 0;
    v_seq             int := 0;

    -- Biến giao dịch
    v_slot_idx        int;
    v_slot_cap        int;
    v_used            int;
    v_guests          int;
    v_tour_id         bigint;
    v_exp_date        date;
    v_tourist_id      bigint;
    v_booking_id      bigint;
    v_payment_id      bigint;
    v_booking_code    varchar(32);
    v_txn_seq         int;
    v_total           numeric(14,2);
    v_created_at      timestamptz;
    v_paid_at         timestamptz;
    v_completed_at    timestamptz;
    v_base_price      numeric;
    v_child_price     numeric;
    v_toddler_price   numeric;
    v_commission      numeric(14,2);
    v_provider_net    numeric(14,2);
    v_cnt             int;
    i                 int;
BEGIN
    -- ═══════════════════════════════════════════════════════════════════════════
    --  0. Idempotent — đã seed năm này thì thoát
    -- ═══════════════════════════════════════════════════════════════════════════
    SELECT count(*) INTO v_cnt
    FROM bookings WHERE booking_code LIKE 'JGH26%';
    IF v_cnt > 0 THEN
        RAISE NOTICE '[Seed 14] Đã có % booking JGH24 — bỏ qua.', v_cnt;
        RETURN;
    END IF;

    -- ═══════════════════════════════════════════════════════════════════════════
    --  1. Thu thập dữ liệu nền
    -- ═══════════════════════════════════════════════════════════════════════════
    SELECT array_agg(id ORDER BY id) INTO v_tourists
    FROM users
    WHERE email LIKE 'demo.tourist%@demo.journeygo.local';

    IF v_tourists IS NULL THEN
        RAISE EXCEPTION 'Chưa có tài khoản Tourist demo — hãy chạy 10_demo_history_common.sql trước.';
    END IF;

    -- Các tour wizard của provider 4 CÓ đủ 4 loại giá (ADULT/CHILD/TODDLER/INFANT).
    CREATE TEMP TABLE tmp_tours26 ON COMMIT DROP AS
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
    WHERE t.created_by = 4
      AND t.deleted = false
      AND t.tour_format IS NOT NULL
      AND t.status = 'PUBLISHED'
      AND tp.adult_price IS NOT NULL
      AND tp.child_price IS NOT NULL
      AND tp.toddler_price IS NOT NULL;

    GET DIAGNOSTICS v_cnt = ROW_COUNT;
    RAISE NOTICE '[Seed 14] Số tour hợp lệ: %', v_cnt;

    -- Slot ứng viên trong năm 2026 (chỉ slot thuộc các tour hợp lệ).
    -- `weight` = hệ số mùa × hệ số năm ⇒ trọng số phân bổ booking.
    CREATE TEMP TABLE tmp_slots26 ON COMMIT DROP AS
    SELECT s.id       AS slot_id,
           s.tour_id  AS tour_id,
           s.slot_date AS slot_date,
           s.capacity AS capacity,
           s.booked_count AS booked_count,
           (demo_season_factor(s.slot_date) * demo_year_factor(s.slot_date))::numeric AS weight
    FROM tour_slots s
    JOIN tmp_tours26 t ON t.tour_id = s.tour_id
    WHERE s.slot_date >= make_date(c_year, 1, 1)
      AND s.slot_date <  make_date(c_year + 1, 1, 1)
      AND s.slot_date <= DATE '2026-11-26';

    GET DIAGNOSTICS v_cnt = ROW_COUNT;
    v_total_slots := v_cnt;

    SELECT count(*), sum(capacity), sum(weight)
      INTO v_cnt, v_capacity_sum, v_weight_sum
      FROM tmp_slots26;
    RAISE NOTICE '[Seed 14] Slot 2026: % (sức chứng %, trọng số %)', v_total_slots, v_capacity_sum, v_weight_sum;

    IF v_total_slots = 0 THEN
        RAISE EXCEPTION 'Không có slot nào trong năm 2026 — hãy chạy 11_demo_history_catalog.sql trước.';
    END IF;

    -- ═══════════════════════════════════════════════════════════════════════════
    --  2. Duyệt slot, sinh booking theo hệ số mùa
    --  Phân bổ theo "hàng đối" (cumulative quota) ⇒ tổng CHÍNH XÁC = c_target
    --  (mỗi slot nhận floor(cum_w/total_w × target) − floor(prev_cum_w/total_w × target)).
    -- ═══════════════════════════════════════════════════════════════════════════
    FOR v_slots IN
        SELECT slot_id, tour_id, slot_date, capacity, booked_count,
               sum(weight) OVER (ORDER BY slot_date, tour_id, slot_id) AS cum_weight
        FROM tmp_slots26
        ORDER BY slot_date, tour_id, slot_id
    LOOP
        -- Số booking của slot này = chênh lệch hàng đối.
        v_cnt := floor(v_slots.cum_weight / v_weight_sum * c_target)::int
               - floor(v_prev_cum / v_weight_sum * c_target)::int;
        v_prev_cum := v_slots.cum_weight;

        -- Bù chênh lệch cho các tháng thấp điểm: đảm bảo mỗi slot ≥ 1 booking
        -- (để dữ liệu phủ đều toàn bộ lịch khởi hành).
        IF v_cnt < 1 THEN
            v_cnt := 1;
        END IF;

        -- Không vượt quá sức chứa còn lại của slot.
        v_slot_cap := v_slots.capacity;
        v_used := COALESCE(v_slots.booked_count, 0);
        IF v_used + v_cnt > v_slot_cap THEN
            v_cnt := GREATEST(v_slot_cap - v_used, 0);
        END IF;

        -- Tổng số booking vượt mục tiêu ⇒ dừng phần sinh của slot này.
        IF v_created + v_cnt > c_target THEN
            v_cnt := GREATEST(c_target - v_created, 0);
        END IF;

        FOR i IN 1..v_cnt LOOP
            v_seq := v_seq + 1;

            -- ── Chọn giá theo tour ──────────────────────────────────────────
            SELECT adult_price, child_price, toddler_price
              INTO v_base_price, v_child_price, v_toddler_price
              FROM tmp_tours26
             WHERE tour_id = v_slots.tour_id;

            -- Số khách: 1..3 (người lớn + phụ).
            v_guests := 1 + ((v_seq * 7 + v_slots.tour_id) % 3);

            -- Tổng tiền = giá ADULT (người lớn) + CHILD (nếu có) + TODDLER (nếu có).
            v_total := v_base_price;
            IF v_guests >= 2 THEN
                v_total := v_total + v_child_price;
            END IF;
            IF v_guests >= 3 THEN
                v_total := v_total + v_toddler_price;
            END IF;

            -- ── Mốc thời gian ──────────────────────────────────────────────
            v_exp_date    := v_slots.slot_date;
            v_created_at  := ((v_exp_date - 4)::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')
                            + (interval '9 hours' + (v_seq % 8) * interval '37 minutes');
            v_paid_at     := v_created_at + interval '6 minutes';
            v_completed_at:= ((v_exp_date + 1)::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')
                            + interval '16 hours';

            -- ── Mã định danh ───────────────────────────────────────────────
            v_booking_code := 'JGH26' || lpad(v_seq::text, 6, '0');
            v_txn_seq      := v_seq;

            -- ── Tourist ────────────────────────────────────────────────────
            v_tourist_id := v_tourists[((v_seq * 13 + v_slots.tour_id) % array_length(v_tourists, 1)) + 1];

            -- ══ BOOKING ════════════════════════════════════════════════════
            INSERT INTO bookings (booking_code, tourist_id, tour_id, experience_date,
                                  total_amount, discount_amount, voucher_scope, currency,
                                  status, created_at, payment_deadline, paid_at, confirmed_at,
                                  completed_at, slot_count, updated_at, seed_tag)
            VALUES (v_booking_code, v_tourist_id, v_slots.tour_id, v_exp_date,
                    v_total, 0, NULL, 'VND',
                    'COMPLETED', v_created_at, v_created_at + interval '15 minutes',
                    v_paid_at, v_paid_at, v_completed_at, v_guests, v_created_at, c_seed_tag)
            RETURNING id INTO v_booking_id;

            -- ══ HÀNH KHÁCH ═════════════════════════════════════════════════
            -- 1 hàng cho mỗi khách: người lớn (ADULT) + tuỳ chọn CHILD / TODDLER.
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
            VALUES (v_booking_id, v_slots.slot_id, 'TOUR', v_exp_date, v_guests, FALSE, v_created_at);

            -- ══ PAYMENT (VNPAY — SUCCESS) ═══════════════════════════════════
            INSERT INTO payments (booking_id, txn_ref, vnp_transaction_no, vnp_bank_tran_no,
                                  bank_code, card_type, method, status, amount, currency,
                                  created_at, expires_at, paid_at, resolved_at,
                                  vnp_response_code, vnp_transaction_status, vnp_message,
                                  duplicate_payment, ipn_count, query_count, updated_at)
            VALUES (v_booking_id,
                    'JGTX' || v_booking_code,
                    'VNP26' || lpad(v_txn_seq::text, 12, '0'),
                    'BANK26' || lpad(v_txn_seq::text, 12, '0'),
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
            VALUES (c_profile_id, v_booking_id, v_payment_id,
                    demo_revenue_period(v_exp_date), v_exp_date,
                    v_total, 0, v_commission, c_rate,
                    0, 0, NULL,
                    v_provider_net, 'ELIGIBLE', NULL,
                    NULL, v_completed_at, NULL,
                    v_created_at, v_created_at);

            v_created := v_created + 1;
        END LOOP;
    END LOOP;

    -- ═══════════════════════════════════════════════════════════════════════════
    --  3. Cập nhật booked_count của slot
    -- ═══════════════════════════════════════════════════════════════════════════
    UPDATE tour_slots s
       SET booked_count = COALESCE(agg.cnt, 0)
      FROM (
            SELECT tour_slot_id, sum(slot_count)::int AS cnt
            FROM booking_slot_holds
            WHERE released = false
              AND tour_slot_id IS NOT NULL
              AND booking_id IN (SELECT id FROM bookings WHERE booking_code LIKE 'JGH26%')
            GROUP BY tour_slot_id
      ) agg
     WHERE s.id = agg.tour_slot_id;

    RAISE NOTICE '[Seed 14] ✔ Đã tạo % booking cho năm 2026.', v_created;
END
$seed$;

-- ═══════════════════════════════════════════════════════════════════════════
--  4. CHECKPOINT
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO demo_seed_checkpoints (script_name, batch_tag, record_count, note)
SELECT '14_demo_history_bookings_2026', 'JGHD2024_2026',
       (SELECT count(*) FROM bookings WHERE booking_code LIKE 'JGH26%'),
       'Booking 2026 (COMPLETED + payment SUCCESS + provider_revenue ELIGIBLE).'
ON CONFLICT (script_name) DO UPDATE
    SET record_count = EXCLUDED.record_count,
        executed_at  = now(),
        note         = EXCLUDED.note;

\echo '=== Tổng quan 2026 ==='
SELECT count(*)                                     AS so_booking,
       count(DISTINCT tour_id)                      AS so_tour,
       count(DISTINCT tourist_id)                   AS so_tourist,
       min(experience_date)                         AS ngay_dau,
       max(experience_date)                         AS ngay_cuoi,
       sum(total_amount)                            AS doanh_thu_goc,
       round(sum(total_amount) * 0.20, 2)           AS hoa_hong,
       sum(total_amount) - round(sum(total_amount) * 0.20, 2) AS thu_he_doi_tac
FROM bookings
WHERE booking_code LIKE 'JGH26%';

\echo '=== Phân bổ theo tháng 2026 ==='
SELECT to_char(experience_date, 'YYYY-MM') AS thang,
       count(*)                            AS so_booking,
       sum(total_amount)                   AS doanh_thu
FROM bookings
WHERE booking_code LIKE 'JGH26%'
GROUP BY 1 ORDER BY 1;

\echo '=== Phân bổ theo kỳ tất toán 10 ngày (mẫu 12 kỳ đầu) ==='
SELECT revenue_period, count(*) AS so_booking, sum(gross_amount) AS gross, sum(provider_net_amount) AS net
FROM provider_revenues
WHERE booking_id IN (SELECT id FROM bookings WHERE booking_code LIKE 'JGH26%')
GROUP BY 1 ORDER BY 1 LIMIT 12;
