-- =====================================================================================
--  MANUAL SEED 06 — DỮ LIỆU MẪU TEST GHÉP TOUR B2B 1-1 ("Chọn từ lịch khởi hành")
-- =====================================================================================
--  Tạo 3 tour PUBLISHED (luồng 5 bước, DAY_TRIP) trên 3 ngày khởi hành tương lai
--  (CURRENT_DATE + 3, +5, +7):
--   1. Tour A (provider@journeygo.com): 08:00 sáng, 3 điểm (Ninh Kiều -> Cái Răng -> Cồn Sơn)
--      + 1 booking CONFIRMED (3 khách) ở ngày +3 để test Passenger Manifest & capacity.
--   2. Tour B (provider2@journeygo.com): 08:15 sáng, 3 điểm (Ninh Kiều -> Cái Răng -> Mỹ Khánh)
--      + 1 booking CONFIRMED (2 khách) ở ngày +3.
--      -> Khớp 2 điểm đầu với Tour A, lệch 15 phút (<= 30p) -> gợi ý tự động trong /candidates.
--   3. Tour C (provider1@journeygo.com): 09:30 sáng, đảo ngược thứ tự điểm (Cái Răng -> Ninh Kiều)
--      -> KHÔNG khớp điều kiện ghép (dùng để test negative case / lọc loại trừ).
--
--  IDEMPOTENT: kiểm tra theo title và booking_code trước khi INSERT.
-- =====================================================================================

\set ON_ERROR_STOP on

DO $$
DECLARE
    v_prov_a      bigint;
    v_prov_b      bigint;
    v_prov_c      bigint;
    v_tourist_a   bigint;
    v_tourist_b   bigint;
    v_region_id   bigint;
    v_theme_id    bigint;

    v_tour_a      bigint;
    v_tour_b      bigint;
    v_tour_c      bigint;

    v_slot_a_d1   bigint;
    v_slot_b_d1   bigint;
    v_booking_id  bigint;

    v_d1          date := CURRENT_DATE + 3;
    v_d2          date := CURRENT_DATE + 5;
    v_d3          date := CURRENT_DATE + 7;
    v_now         timestamptz := NOW();
BEGIN
    SELECT id INTO v_prov_a FROM users WHERE email = 'provider@journeygo.com' LIMIT 1;
    SELECT id INTO v_prov_b FROM users WHERE email = 'provider2@journeygo.com' LIMIT 1;
    SELECT id INTO v_prov_c FROM users WHERE email = 'provider1@journeygo.com' LIMIT 1;
    SELECT id INTO v_tourist_a FROM users WHERE email = 'tourist@journeygo.com' LIMIT 1;
    SELECT id INTO v_tourist_b FROM users WHERE email = 'tourist1@journeygo.com' LIMIT 1;
    SELECT id INTO v_region_id FROM regions ORDER BY id LIMIT 1;
    SELECT id INTO v_theme_id FROM themes ORDER BY id LIMIT 1;

    IF v_prov_a IS NULL OR v_prov_b IS NULL OR v_prov_c IS NULL THEN
        RAISE EXCEPTION 'Thiếu tài khoản provider demo (provider@, provider1@, provider2@).';
    END IF;
    IF v_tourist_a IS NULL OR v_tourist_b IS NULL THEN
        RAISE EXCEPTION 'Thiếu tài khoản tourist demo (tourist@, tourist1@).';
    END IF;

    -- ── 1. TOUR A (Provider A - Host gợi ý) ───────────────────────────────────────────
    SELECT tour_id INTO v_tour_a
    FROM tours
    WHERE title = '[B2B Demo] Cần Thơ Sông Nước – Chợ Nổi & Cồn Sơn' AND deleted = FALSE
    LIMIT 1;

    IF v_tour_a IS NULL THEN
        INSERT INTO tours (
            title, tour_type, tour_format, duration_days, duration_minutes, duration_nights,
            region_id, theme_id, description, max_guests_per_slot,
            departure_time, meeting_point, pickup_info,
            approved, status, content_rights_confirmed, version_number,
            deleted, created_by, created_at, updated_at, published_at
        ) VALUES (
            '[B2B Demo] Cần Thơ Sông Nước – Chợ Nổi & Cồn Sơn',
            'ECOTOURISM', 'DAY_TRIP', 1, 360, 0,
            v_region_id, v_theme_id,
            'Khởi hành buổi sáng từ Bến Ninh Kiều, tham quan Chợ nổi Cái Răng và trải nghiệm làng cá bè Cồn Sơn.',
            16,
            '08:00 sáng', 'Cổng chính Bến Ninh Kiều, Cần Thơ', 'Đón khách tại cổng chính trước 15 phút',
            TRUE, 'PUBLISHED', TRUE, 1,
            FALSE, v_prov_a, v_now, v_now, v_now
        ) RETURNING tour_id INTO v_tour_a;

        INSERT INTO tour_prices (tour_id, guest_type, price, counts_toward_slot) VALUES
            (v_tour_a, 'ADULT',   650000, TRUE),
            (v_tour_a, 'CHILD',   450000, TRUE),
            (v_tour_a, 'TODDLER', 200000, TRUE),
            (v_tour_a, 'INFANT',       0, FALSE);

        INSERT INTO tour_stops (tour_id, sequence_order, name, latitude, longitude, check_in_radius_meters, short_description, created_at, updated_at) VALUES
            (v_tour_a, 1, 'Bến Ninh Kiều',      10.0315000, 105.7875000, 200, 'Điểm tập trung xuất phát thuyền du lịch sông Hậu.', v_now, v_now),
            (v_tour_a, 2, 'Chợ nổi Cái Răng',   10.0028000, 105.7445000, 300, 'Chợ nổi truyền thống sầm uất nhất đồng bằng sông Cửu Long.', v_now, v_now),
            (v_tour_a, 3, 'Làng cá bè Cồn Sơn', 10.0800000, 105.7600000, 300, 'Tham quan bè cá và trải nghiệm làm bánh dân gian tại Cồn Sơn.', v_now, v_now);

        INSERT INTO tour_departure_dates (tour_id, departure_date) VALUES
            (v_tour_a, v_d1), (v_tour_a, v_d2), (v_tour_a, v_d3);

        INSERT INTO tour_slots (tour_id, slot_date, capacity, booked_count, status, created_at) VALUES
            (v_tour_a, v_d1, 16, 0, 'OPEN', v_now),
            (v_tour_a, v_d2, 16, 0, 'OPEN', v_now),
            (v_tour_a, v_d3, 16, 0, 'OPEN', v_now);
    END IF;

    -- ── 2. TOUR B (Provider B - Guest khớp 2 điểm đầu, lệch 15 phút) ──────────────────
    SELECT tour_id INTO v_tour_b
    FROM tours
    WHERE title = '[B2B Demo] Sắc Màu Cần Thơ – Chợ Nổi & Mỹ Khánh' AND deleted = FALSE
    LIMIT 1;

    IF v_tour_b IS NULL THEN
        INSERT INTO tours (
            title, tour_type, tour_format, duration_days, duration_minutes, duration_nights,
            region_id, theme_id, description, max_guests_per_slot,
            departure_time, meeting_point, pickup_info,
            approved, status, content_rights_confirmed, version_number,
            deleted, created_by, created_at, updated_at, published_at
        ) VALUES (
            '[B2B Demo] Sắc Màu Cần Thơ – Chợ Nổi & Mỹ Khánh',
            'ECOTOURISM', 'DAY_TRIP', 1, 360, 0,
            v_region_id, v_theme_id,
            'Hành trình khám phá Bến Ninh Kiều, Chợ nổi Cái Răng và Làng du lịch sinh thái Mỹ Khánh.',
            16,
            '08:15 sáng', 'Bến tàu du lịch Ninh Kiều, Cần Thơ', 'Tập trung tại quầy vé bến tàu',
            TRUE, 'PUBLISHED', TRUE, 1,
            FALSE, v_prov_b, v_now, v_now, v_now
        ) RETURNING tour_id INTO v_tour_b;

        INSERT INTO tour_prices (tour_id, guest_type, price, counts_toward_slot) VALUES
            (v_tour_b, 'ADULT',   680000, TRUE),
            (v_tour_b, 'CHILD',   480000, TRUE),
            (v_tour_b, 'TODDLER', 220000, TRUE),
            (v_tour_b, 'INFANT',       0, FALSE);

        INSERT INTO tour_stops (tour_id, sequence_order, name, latitude, longitude, check_in_radius_meters, short_description, created_at, updated_at) VALUES
            (v_tour_b, 1, 'Bến tàu Ninh Kiều',        10.0317000, 105.7877000, 200, 'Điểm lên tàu tham quan buổi sáng.', v_now, v_now),
            (v_tour_b, 2, 'Chợ nổi Cái Răng Cần Thơ', 10.0030000, 105.7446000, 300, 'Thưởng thức cà phê sáng trên ghe tại Chợ nổi Cái Răng.', v_now, v_now),
            (v_tour_b, 3, 'Làng du lịch Mỹ Khánh',    9.9850000,  105.7120000, 300, 'Vườn trái cây và trò chơi dân gian tại Mỹ Khánh.', v_now, v_now);

        INSERT INTO tour_departure_dates (tour_id, departure_date) VALUES
            (v_tour_b, v_d1), (v_tour_b, v_d2), (v_tour_b, v_d3);

        INSERT INTO tour_slots (tour_id, slot_date, capacity, booked_count, status, created_at) VALUES
            (v_tour_b, v_d1, 16, 0, 'OPEN', v_now),
            (v_tour_b, v_d2, 16, 0, 'OPEN', v_now),
            (v_tour_b, v_d3, 16, 0, 'OPEN', v_now);
    END IF;

    -- ── 3. TOUR C (Provider C - Không khớp: lệch 90p & ngược điểm đến) ─────────────────
    SELECT tour_id INTO v_tour_c
    FROM tours
    WHERE title = '[B2B Demo - Không khớp] Cần Thơ Ngược Tuyến – Cái Răng trước' AND deleted = FALSE
    LIMIT 1;

    IF v_tour_c IS NULL THEN
        INSERT INTO tours (
            title, tour_type, tour_format, duration_days, duration_minutes, duration_nights,
            region_id, theme_id, description, max_guests_per_slot,
            departure_time, meeting_point,
            approved, status, content_rights_confirmed, version_number,
            deleted, created_by, created_at, updated_at, published_at
        ) VALUES (
            '[B2B Demo - Không khớp] Cần Thơ Ngược Tuyến – Cái Răng trước',
            'ECOTOURISM', 'DAY_TRIP', 1, 300, 0,
            v_region_id, v_theme_id,
            'Tour test negative case: đi Chợ nổi trước rồi mới về Ninh Kiều, xuất phát lúc 09:30.',
            16,
            '09:30 sáng', 'Bến tàu Cái Răng',
            TRUE, 'PUBLISHED', TRUE, 1,
            FALSE, v_prov_c, v_now, v_now, v_now
        ) RETURNING tour_id INTO v_tour_c;

        INSERT INTO tour_prices (tour_id, guest_type, price, counts_toward_slot) VALUES
            (v_tour_c, 'ADULT',   550000, TRUE),
            (v_tour_c, 'CHILD',   350000, TRUE),
            (v_tour_c, 'TODDLER', 150000, TRUE),
            (v_tour_c, 'INFANT',       0, FALSE);

        INSERT INTO tour_stops (tour_id, sequence_order, name, latitude, longitude, check_in_radius_meters, short_description, created_at, updated_at) VALUES
            (v_tour_c, 1, 'Chợ nổi Cái Răng', 10.0028000, 105.7445000, 300, 'Bắt đầu từ Chợ nổi.', v_now, v_now),
            (v_tour_c, 2, 'Bến Ninh Kiều',    10.0315000, 105.7875000, 200, 'Kết thúc tại Bến Ninh Kiều.', v_now, v_now);

        INSERT INTO tour_departure_dates (tour_id, departure_date) VALUES
            (v_tour_c, v_d1), (v_tour_c, v_d2), (v_tour_c, v_d3);

        INSERT INTO tour_slots (tour_id, slot_date, capacity, booked_count, status, created_at) VALUES
            (v_tour_c, v_d1, 16, 0, 'OPEN', v_now),
            (v_tour_c, v_d2, 16, 0, 'OPEN', v_now),
            (v_tour_c, v_d3, 16, 0, 'OPEN', v_now);
    END IF;

    -- ── 4. BOOKING MẪU CHO NGÀY ĐẦU TIÊN (d1 = CURRENT_DATE + 3) ──────────────────────
    SELECT id INTO v_slot_a_d1 FROM tour_slots WHERE tour_id = v_tour_a AND slot_date = v_d1 LIMIT 1;
    SELECT id INTO v_slot_b_d1 FROM tour_slots WHERE tour_id = v_tour_b AND slot_date = v_d1 LIMIT 1;

    -- Booking của Tour A: 3 khách (1950000 VND)
    IF v_slot_a_d1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM bookings WHERE booking_code = 'JGMERGE-HOST-01') THEN
        INSERT INTO bookings (
            booking_code, tourist_id, tour_id, experience_date,
            total_amount, discount_amount, currency, status,
            created_at, payment_deadline, paid_at, confirmed_at, updated_at, slot_count
        ) VALUES (
            'JGMERGE-HOST-01', v_tourist_a, v_tour_a, v_d1,
            1950000, 0, 'VND', 'CONFIRMED',
            v_now, v_now + INTERVAL '10 minutes', v_now, v_now, v_now, 3
        ) RETURNING id INTO v_booking_id;

        INSERT INTO booking_passengers (
            booking_id, full_name, birth_date, gender, email,
            guest_type, price, counts_toward_slot, is_booking_customer, linked_user_id,
            status, created_at, updated_at
        ) VALUES
            (v_booking_id, 'Nguyễn An',      '1995-04-12', 'MALE',   'nguyenan.host@gmail.com',   'ADULT', 650000, TRUE, TRUE,  v_tourist_a, 'ACTIVE', v_now, v_now),
            (v_booking_id, 'Lê Thị Hoa',     '1996-08-20', 'FEMALE', 'lehoa.host@gmail.com',      'ADULT', 650000, TRUE, FALSE, NULL,        'ACTIVE', v_now, v_now),
            (v_booking_id, 'Phạm Minh Tuấn', '1994-11-03', 'MALE',   'minhtuan.host@gmail.com',   'ADULT', 650000, TRUE, FALSE, NULL,        'ACTIVE', v_now, v_now);

        INSERT INTO booking_slot_holds (
            booking_id, tour_slot_id, slot_type, slot_date, slot_count, released, held_at
        ) VALUES (
            v_booking_id, v_slot_a_d1, 'TOUR', v_d1, 3, FALSE, v_now
        );

        UPDATE tour_slots SET booked_count = 3 WHERE id = v_slot_a_d1;
    END IF;

    -- Booking của Tour B: 2 khách (1360000 VND)
    IF v_slot_b_d1 IS NOT NULL AND NOT EXISTS (SELECT 1 FROM bookings WHERE booking_code = 'JGMERGE-GUEST-01') THEN
        INSERT INTO bookings (
            booking_code, tourist_id, tour_id, experience_date,
            total_amount, discount_amount, currency, status,
            created_at, payment_deadline, paid_at, confirmed_at, updated_at, slot_count
        ) VALUES (
            'JGMERGE-GUEST-01', v_tourist_b, v_tour_b, v_d1,
            1360000, 0, 'VND', 'CONFIRMED',
            v_now, v_now + INTERVAL '10 minutes', v_now, v_now, v_now, 2
        ) RETURNING id INTO v_booking_id;

        INSERT INTO booking_passengers (
            booking_id, full_name, birth_date, gender, email,
            guest_type, price, counts_toward_slot, is_booking_customer, linked_user_id,
            status, created_at, updated_at
        ) VALUES
            (v_booking_id, 'Nguyễn Văn A', '1992-02-14', 'MALE',   'vana.guest@gmail.com',   'ADULT', 680000, TRUE, TRUE,  v_tourist_b, 'ACTIVE', v_now, v_now),
            (v_booking_id, 'Trần Thu Hà',  '1993-07-09', 'FEMALE', 'thuha.guest@gmail.com',  'ADULT', 680000, TRUE, FALSE, NULL,        'ACTIVE', v_now, v_now);

        INSERT INTO booking_slot_holds (
            booking_id, tour_slot_id, slot_type, slot_date, slot_count, released, held_at
        ) VALUES (
            v_booking_id, v_slot_b_d1, 'TOUR', v_d1, 2, FALSE, v_now
        );

        UPDATE tour_slots SET booked_count = 2 WHERE id = v_slot_b_d1;
    END IF;
END $$;
