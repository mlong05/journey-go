-- =====================================================================================
--  25_demo_backfill_gap_months.sql
--  BACKFILL MONTHS THAT ARE MISSING FROM THE PROVIDER HISTORY SEED
-- =====================================================================================
--  WHY
--    Script 16 (16_demo_history_bookings_all_providers.sql) distributed bookings with
--    a "cumulative quota" over tour slots ordered by slot_date, BUT it also forced
--    a minimum of 1 booking per slot:
--
--        IF v_cnt < 1 THEN v_cnt := 1; END IF;
--
--    For providers owning MANY slots relative to the 1,500-booking target
--    (profile 2 -> 1,983 slots, profile 3 -> 3,388 slots) the per-slot quota is
--    below 1, so nearly every slot was pushed to 1. The guard
--        IF v_created + v_cnt > c_target THEN v_cnt := ... END IF;
--    then truncated the run at the EARLIEST slots (the loop is ORDER BY slot_date),
--    so all 1,500 bookings piled up in the early months and the later months of
--    the 2024-2026 window were left EMPTY.
--
--    Result: providers 2 and 3 showed missing buckets in the "All" chart
--    (profile 2: 5 missing months, profile 3: 17 missing months).
--
--  FIX ALREADY APPLIED
--    Script 16 now removes the ">= 1" floor and computes the quota against a
--    window total (sum(weight) OVER ()) so the target spreads across the WHOLE
--    window. This script repairs the already-seeded rows.
--
--  DENSITY
--    A "normal" month for these providers holds roughly one booking per slot
--    (profile 2 ~ 57 slots/month -> ~57 bookings, profile 3 ~ 97 -> ~97).
--    This script therefore walks the slots of each missing month and creates one
--    booking per slot, so the backfilled months match the existing ones in
--    volume and the chart shows a flat line instead of a dip.
--
--  WHY BACKFILL AND NOT RESEED
--    All 22 gap months have ZERO provider_revenues and ZERO settlements
--    (verified). Therefore inserting new bookings into those months cannot
--    invalidate any settlement, settlement_detail, or wallet transaction.
--
--  SAFETY
--    * No DELETE / TRUNCATE / DROP.
--    * No settlement is inserted here - settlements for the new revenues are
--      created later through the official Admin API (scripts 22 / 24).
--    * Idempotent: re-running adds nothing new for months already covered.
--    * Financial math mirrors ProviderRevenue#recalculate exactly:
--        commission   = round(gross * rate, 2)
--        provider_net = gross - commission
-- =====================================================================================

\set ON_ERROR_STOP on

DO $guard$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@journeygo.com') THEN
        RAISE EXCEPTION 'admin@journeygo.com not found - aborting for safety.';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM users WHERE email LIKE 'demo.tourist%@demo.journeygo.local') THEN
        RAISE EXCEPTION 'Demo tourist accounts are missing - run 10_demo_history_common.sql first.';
    END IF;
END
$guard$;

DO $backfill$
DECLARE
    c_seed_tag    text    := 'JGPB2026_2026';
    -- Prefix RIENG cho backfill: booking_code / vnp_transaction_no phai
    -- khong trung voi du lieu da sinh boi script 16 (JGPB0xx / VNPB00xxxxxxx).
    c_code_prefix text    := 'JGBF';
    c_rate        numeric := 0.2000;
    -- Offset rieng cho ma giao dich (tranh trung VNPB cua script 16).
    c_txn_offset  bigint  := 900000000;

    v_prof       record;
    v_months     date[];
    v_month      date;
    v_slot_rec   record;
    v_tourist_id bigint;
    v_tourists   bigint[];
    v_booking_id bigint;
    v_payment_id bigint;
    v_booking_code varchar(32);
    v_txn_seq    bigint;
    v_seq        bigint := 0;
    v_total      numeric(14,2);
    v_created_at timestamptz;
    v_paid_at    timestamptz;
    v_completed_at timestamptz;
    v_base_price numeric;
    v_child_price numeric;
    v_toddler_price numeric;
    v_commission numeric(14,2);
    v_provider_net numeric(14,2);
    v_created    int := 0;
    v_guests     int;
BEGIN
    SELECT array_agg(id ORDER BY id) INTO v_tourists
    FROM users
    WHERE email LIKE 'demo.tourist%@demo.journeygo.local';

    IF v_tourists IS NULL THEN
        RAISE EXCEPTION 'No demo tourists found.';
    END IF;

    -- Only providers that actually have a gap in the 2024-01 -> 2026-11 window.
    FOR v_prof IN
        SELECT pp.id AS profile_id, pp.user_id
        FROM provider_profiles pp
        WHERE pp.id IN (2, 3)
        ORDER BY pp.id
    LOOP
        -- Months with no booking at all for this provider (bookings are the
        -- source of truth for the dashboard chart).
        SELECT array_agg(m::date ORDER BY m)
        INTO v_months
        FROM generate_series(date '2024-01-01', date '2026-11-01', interval '1 month') m
        WHERE NOT EXISTS (
            SELECT 1
            FROM provider_revenues r
            JOIN bookings b ON b.id = r.booking_id
            WHERE r.provider_profile_id = v_prof.profile_id
              AND to_char(b.paid_at, 'YYYY-MM') = to_char(m, 'YYYY-MM')
        );

        IF v_months IS NULL THEN
            RAISE NOTICE '[Backfill 25] Profile %: no gap months - skip.', v_prof.profile_id;
            CONTINUE;
        END IF;

        RAISE NOTICE '[Backfill 25] Profile %: % gap month(s) to fill.', v_prof.profile_id,
                     array_length(v_months, 1);

        -- Sequence number continues after whatever a previous run already created.
        SELECT count(*) INTO v_seq
        FROM bookings
        WHERE seed_tag = c_seed_tag
          AND booking_code LIKE c_code_prefix || lpad(v_prof.profile_id::text, 2, '0') || '%';

        FOREACH v_month IN ARRAY v_months LOOP
            v_created := 0;

            -- Walk the slots of the missing month, one booking per slot.
            FOR v_slot_rec IN
                SELECT s.id AS slot_id,
                       s.slot_date AS slot_date,
                       s.capacity AS capacity,
                       COALESCE(s.booked_count, 0) AS booked_count,
                       t.tour_id AS tour_id,
                       tp.adult_price AS adult_price,
                       tp.child_price AS child_price,
                       tp.toddler_price AS toddler_price
                FROM tour_slots s
                JOIN tours t ON t.tour_id = s.tour_id
                JOIN LATERAL (
                    SELECT max(price) FILTER (WHERE guest_type = 'ADULT')   AS adult_price,
                           max(price) FILTER (WHERE guest_type = 'CHILD')   AS child_price,
                           max(price) FILTER (WHERE guest_type = 'TODDLER') AS toddler_price
                    FROM tour_prices WHERE tour_id = t.tour_id
                ) tp ON TRUE
                WHERE t.created_by = v_prof.user_id
                  AND t.deleted = false
                  AND t.status = 'PUBLISHED'
                  AND s.status = 'OPEN'
                  AND s.slot_date >= v_month
                  AND s.slot_date < (v_month + interval '1 month')::date
                  AND tp.adult_price IS NOT NULL
                  AND tp.child_price IS NOT NULL
                  AND tp.toddler_price IS NOT NULL
                ORDER BY s.slot_date, t.tour_id, s.id
            LOOP
                v_seq := v_seq + 1;
                v_base_price   := v_slot_rec.adult_price;
                v_child_price  := v_slot_rec.child_price;
                v_toddler_price := v_slot_rec.toddler_price;

                v_guests := 1 + ((v_seq * 7 + v_slot_rec.tour_id) % 3);

                -- Respect the slot capacity.
                IF v_slot_rec.booked_count + v_guests > v_slot_rec.capacity THEN
                    CONTINUE;
                END IF;

                v_total := v_base_price;
                IF v_guests >= 2 THEN v_total := v_total + v_child_price; END IF;
                IF v_guests >= 3 THEN v_total := v_total + v_toddler_price; END IF;

                v_created_at   := ((v_slot_rec.slot_date - 4)::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')
                                  + (interval '9 hours' + (v_seq % 8) * interval '37 minutes');
                v_paid_at      := v_created_at + interval '6 minutes';
                v_completed_at := ((v_slot_rec.slot_date + 1)::timestamptz AT TIME ZONE 'Asia/Ho_Chi_Minh')
                                  + interval '16 hours';

                v_booking_code := c_code_prefix || lpad(v_prof.profile_id::text, 2, '0')
                                  || lpad(v_seq::text, 6, '0');
                v_txn_seq := v_prof.profile_id * 1000000 + v_seq + c_txn_offset;

                v_tourist_id := v_tourists[((v_seq * 13 + v_slot_rec.tour_id)
                                           % array_length(v_tourists, 1)) + 1];

                IF EXISTS (SELECT 1 FROM bookings WHERE booking_code = v_booking_code) THEN
                    CONTINUE;
                END IF;

                INSERT INTO bookings (booking_code, tourist_id, tour_id, experience_date,
                                      total_amount, discount_amount, voucher_scope, currency,
                                      status, created_at, payment_deadline, paid_at, confirmed_at,
                                      completed_at, slot_count, updated_at, seed_tag)
                VALUES (v_booking_code, v_tourist_id, v_slot_rec.tour_id, v_slot_rec.slot_date,
                        v_total, 0, NULL, 'VND',
                        'COMPLETED', v_created_at, v_created_at + interval '15 minutes',
                        v_paid_at, v_paid_at, v_completed_at, v_guests, v_created_at, c_seed_tag)
                RETURNING id INTO v_booking_id;

                INSERT INTO booking_passengers (booking_id, full_name, birth_date, gender, email,
                                                guest_type, price, counts_toward_slot,
                                                is_booking_customer, linked_user_id, status,
                                                created_at, updated_at)
                SELECT v_booking_id,
                       u.full_name || CASE p.gt WHEN 'ADULT' THEN ''
                                                WHEN 'CHILD' THEN ' (nho)'
                                                ELSE ' (be)' END,
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
                    UNION ALL SELECT 'CHILD',   v_child_price  WHERE v_guests >= 2
                    UNION ALL SELECT 'TODDLER', v_toddler_price WHERE v_guests >= 3
                ) p
                WHERE u.id = v_tourist_id;

                INSERT INTO booking_slot_holds (booking_id, tour_slot_id, slot_type, slot_date,
                                                slot_count, released, held_at)
                VALUES (v_booking_id, v_slot_rec.slot_id, 'TOUR', v_slot_rec.slot_date, v_guests, FALSE, v_created_at);

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
                        demo_revenue_period(v_slot_rec.slot_date), v_slot_rec.slot_date,
                        v_total, 0, v_commission, c_rate,
                        0, 0, NULL,
                        v_provider_net, 'ELIGIBLE', NULL,
                        NULL, v_completed_at, NULL,
                        v_created_at, v_created_at);

                v_created := v_created + 1;
            END LOOP;

            RAISE NOTICE '[Backfill 25] Profile % month %: created % booking(s).',
                         v_prof.profile_id, to_char(v_month, 'YYYY-MM'), v_created;
        END LOOP;

        -- Refresh booked_count for the slots we just touched.
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
    END LOOP;

    RAISE NOTICE '[Backfill 25] Done.';
END
$backfill$;

INSERT INTO demo_seed_checkpoints (script_name, batch_tag, record_count, note)
   SELECT '25_demo_backfill_gap_months', 'JGPB2026_2026',
       (SELECT count(*) FROM bookings WHERE seed_tag = 'JGPB2026_2026'),
       'Backfill booking cho cac thang bi trong o cua profile 2 va 3 (do bug phan bo quota cua script 16).'
ON CONFLICT (script_name) DO UPDATE
    SET record_count = EXCLUDED.record_count,
        executed_at  = now(),
        note         = EXCLUDED.note;
