-- =====================================================================================
--  SEED 91 — DỌN DỮ LIỆU TEST (đợt kiểm thử API/luồng ngày 26/11/2026) — CHẠY THỦ CÔNG
-- =====================================================================================
--  Mục đích
--    Gỡ toàn bộ dữ liệu do đợt test báo cáo "Report5_Test Report" tạo ra trong DB dev:
--    đơn đặt tour #25–#35 (kể cả các đơn "thanh toán" mô phỏng + hoàn tiền), yêu cầu tour
--    #1–#2, bài cộng đồng #4–#6, các tour test #70–#76, voucher APITEST*, chính sách hoa
--    hồng "[API TEST]", khu vực/chủ đề "[API TEST]", hồ sơ đối tác test (user apitest*),
--    điểm thưởng/thành tựu/huy hiệu/voucher của tourist2 sinh ra từ hành trình test,
--    tin nhắn "[API TEST]", phiên AI của tourist1, thông báo sinh ra trong khoảng test.
--
--  KHÔNG đụng tới: dữ liệu seed (tour 1–69, đơn #1–#24, hoàn tiền JGSAMPLE*, đợt tất toán,
--  tài khoản demo...). Mỗi bước có "chốt chặn" (ASSERT) — nếu dữ liệu không đúng như dự
--  kiến (ví dụ có đơn của người dùng khác nằm trong dải #25–#35) script sẽ DỪNG và
--  ROLLBACK, không xoá gì.
--
--  Cách chạy (luôn BACKUP trước):
--    1) Chạy THỬ — thực hiện xong rồi ROLLBACK, chỉ in báo cáo số dòng bị xoá:
--         psql -h localhost -U postgres -d journeygo_db -v DRY_RUN=1 -f 91_cleanup_api_test_data.sql
--    2) Chạy THẬT:
--         psql -h localhost -U postgres -d journeygo_db -f 91_cleanup_api_test_data.sql
--
--  Đổi mốc thời gian bắt đầu test (dùng để xoá thông báo/phiên AI phát sinh trong lúc test)
--  nếu cần: sửa dòng \set test_start bên dưới.
-- =====================================================================================

\set ON_ERROR_STOP on
\set test_start '2026-11-26 17:50:00+07'

BEGIN;

-- ── Ảnh chụp số dòng trước khi xoá (để in báo cáo chênh lệch ở cuối) ──────────────────
CREATE TEMP TABLE _cleanup_before ON COMMIT DROP AS
SELECT table_name::text AS t,
       (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text::bigint AS n
FROM information_schema.tables
WHERE table_schema = 'public' AND table_type = 'BASE TABLE';

-- ── Hàm xoá đệ quy theo khoá ngoại (tạm thời, tự mất khi hết phiên) ─────────────────────
-- purge(bảng, danh_sách_id): xoá các dòng con tham chiếu (đệ quy) rồi mới xoá dòng cha.
CREATE FUNCTION pg_temp.pk_col(t regclass) RETURNS text LANGUAGE sql AS $$
    SELECT a.attname::text
    FROM pg_index i JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
    WHERE i.indrelid = t AND i.indisprimary AND i.indnatts = 1
$$;

CREATE FUNCTION pg_temp.purge(p_table regclass, p_ids bigint[]) RETURNS void LANGUAGE plpgsql AS $$
DECLARE
    fk        record;
    pk        text;
    cpk       text;
    child_ids bigint[];
    n         bigint;
BEGIN
    IF p_ids IS NULL OR cardinality(p_ids) = 0 THEN RETURN; END IF;
    pk := pg_temp.pk_col(p_table);
    IF pk IS NULL THEN
        RAISE EXCEPTION 'Bảng % không có khoá chính 1 cột', p_table;
    END IF;

    FOR fk IN
        SELECT c.conrelid::regclass AS child, a.attname::text AS col
        FROM pg_constraint c
        JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
        WHERE c.contype = 'f' AND c.confrelid = p_table AND cardinality(c.conkey) = 1
    LOOP
        cpk := pg_temp.pk_col(fk.child);
        IF cpk IS NULL THEN
            -- bảng nối (khoá chính ghép): xoá thẳng
            EXECUTE format('DELETE FROM %s WHERE %I = ANY($1)', fk.child, fk.col) USING p_ids;
        ELSE
            EXECUTE format('SELECT COALESCE(array_agg(%I::bigint), ''{}''::bigint[]) FROM %s WHERE %I = ANY($1)',
                           cpk, fk.child, fk.col) USING p_ids INTO child_ids;
            IF fk.child = p_table THEN   -- tự tham chiếu: bỏ chính các id đang xoá để khỏi lặp vô hạn
                child_ids := ARRAY(SELECT unnest(child_ids) EXCEPT SELECT unnest(p_ids));
            END IF;
            PERFORM pg_temp.purge(fk.child, child_ids);
        END IF;
    END LOOP;

    EXECUTE format('DELETE FROM %s WHERE %I = ANY($1)', p_table, pk) USING p_ids;
    GET DIAGNOSTICS n = ROW_COUNT;
    IF n > 0 THEN RAISE NOTICE '  xoá % dòng khỏi %', n, p_table; END IF;
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
--  0. CHỐT CHẶN — dữ liệu phải đúng như dự kiến, nếu không thì dừng
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$
BEGIN
    ASSERT (SELECT count(*) FROM bookings WHERE id BETWEEN 25 AND 35) = 11,
        'Dải đơn #25–#35 không đủ 11 đơn — dữ liệu đã bị thay đổi, kiểm tra lại';
    ASSERT NOT EXISTS (SELECT 1 FROM bookings WHERE id BETWEEN 25 AND 35 AND tourist_id NOT IN (8, 9)),
        'Có đơn trong dải #25–#35 không thuộc tourist1/tourist2 — dừng để tránh xoá nhầm';
    ASSERT NOT EXISTS (SELECT 1 FROM tours WHERE tour_id BETWEEN 70 AND 76 AND deleted = false),
        'Có tour #70–#76 chưa bị xoá mềm — có thể là tour thật, dừng để tránh xoá nhầm';
    ASSERT NOT EXISTS (SELECT 1 FROM users WHERE email LIKE 'apitest%' AND active = true),
        'Có tài khoản apitest* đang hoạt động — dừng để kiểm tra';
    ASSERT NOT EXISTS (SELECT 1 FROM community_posts WHERE id BETWEEN 4 AND 6 AND author_id <> 8),
        'Có bài #4–#6 không phải của tourist1 — dừng để tránh xoá nhầm';
    ASSERT NOT EXISTS (SELECT 1 FROM tour_requests WHERE id IN (1, 2) AND title NOT LIKE '[API TEST]%'),
        'Yêu cầu tour #1/#2 không phải dữ liệu test — dừng để tránh xoá nhầm';
END
$$;

-- ═══════════════════════════════════════════════════════════════════════════════
--  1. TRẢ LẠI SỐ CHỖ ĐÃ GIỮ (các đơn đã thanh toán mô phỏng còn giữ chỗ, chưa release)
-- ═══════════════════════════════════════════════════════════════════════════════
UPDATE tour_slots s
SET booked_count = GREATEST(0, s.booked_count - h.cnt)
FROM (SELECT tour_slot_id AS id, sum(slot_count) AS cnt
      FROM booking_slot_holds
      WHERE booking_id BETWEEN 25 AND 35 AND released = false AND tour_slot_id IS NOT NULL
      GROUP BY tour_slot_id) h
WHERE s.id = h.id;

UPDATE experience_slot s
SET booked_tour_count = GREATEST(0, s.booked_tour_count - h.cnt)
FROM (SELECT experience_slot_id AS id, sum(slot_count) AS cnt
      FROM booking_slot_holds
      WHERE booking_id BETWEEN 25 AND 35 AND released = false AND experience_slot_id IS NOT NULL
      GROUP BY experience_slot_id) h
WHERE s.id = h.id;

-- ═══════════════════════════════════════════════════════════════════════════════
--  2. ĐƠN ĐẶT TOUR #25–#35 (kéo theo hành khách, giữ chỗ, thanh toán, hoàn tiền + nhật ký,
--     hành trình #10 và tiến độ, tin nhắn, lời mời...)
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$ BEGIN RAISE NOTICE '== Đơn đặt tour #25–#35'; END $$;
SELECT pg_temp.purge('bookings', ARRAY(SELECT id FROM bookings WHERE id BETWEEN 25 AND 35));

-- ═══════════════════════════════════════════════════════════════════════════════
--  3. TOUR TEST #70–#76 (bản nháp/duplicate đã xoá mềm) và YÊU CẦU TOUR #1–#2
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$ BEGIN RAISE NOTICE '== Tour test #70–#76'; END $$;
SELECT pg_temp.purge('tours', ARRAY(SELECT tour_id FROM tours WHERE tour_id BETWEEN 70 AND 76 AND deleted = true));
DO $$ BEGIN RAISE NOTICE '== Yêu cầu tour #1–#2'; END $$;
SELECT pg_temp.purge('tour_requests', ARRAY(SELECT id FROM tour_requests WHERE id IN (1, 2) AND title LIKE '[API TEST]%'));

-- ═══════════════════════════════════════════════════════════════════════════════
--  4. CỘNG ĐỒNG: bài #4–#6 (kéo theo bình luận, tim, báo cáo, ảnh)
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$ BEGIN RAISE NOTICE '== Bài cộng đồng #4–#6'; END $$;
SELECT pg_temp.purge('community_posts', ARRAY(SELECT id FROM community_posts WHERE id BETWEEN 4 AND 6 AND author_id = 8));

-- ═══════════════════════════════════════════════════════════════════════════════
--  5. VOUCHER: voucher APITEST* + voucher tourist2 đã đổi bằng điểm (trả lại 1 lượt cho voucher gốc)
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$ BEGIN RAISE NOTICE '== Voucher'; END $$;
UPDATE vouchers v
SET remaining_quantity = LEAST(v.total_quantity, v.remaining_quantity + x.cnt)
FROM (SELECT voucher_id, count(*) AS cnt FROM user_vouchers
      WHERE user_id = 9 AND redeemed_at >= :'test_start' GROUP BY voucher_id) x
WHERE v.id = x.voucher_id;
DELETE FROM user_vouchers WHERE user_id = 9 AND redeemed_at >= :'test_start';
SELECT pg_temp.purge('vouchers', ARRAY(SELECT id FROM vouchers WHERE code LIKE 'APITEST%'));

-- ═══════════════════════════════════════════════════════════════════════════════
--  6. ĐIỂM THƯỞNG / THÀNH TỰU / HUY HIỆU của tourist2 (user 9) sinh ra trong lúc test
--     (trước test tourist2 chưa có dòng điểm nào — GET /gamification/points/my báo lỗi 500)
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$ BEGIN RAISE NOTICE '== Điểm thưởng / thành tựu / huy hiệu của user 9'; END $$;
DELETE FROM user_badges        WHERE user_id = 9 AND earned_at   >= :'test_start';
DELETE FROM user_achievements  WHERE user_id = 9 AND created_at  >= :'test_start';
DELETE FROM point_transactions WHERE user_id = 9 AND created_at  >= :'test_start';
DELETE FROM user_points        WHERE user_id = 9
                                 AND NOT EXISTS (SELECT 1 FROM point_transactions p WHERE p.user_id = 9);

-- ═══════════════════════════════════════════════════════════════════════════════
--  7. CẤU HÌNH TEST: chính sách hoa hồng, khu vực, chủ đề, lý do hoàn tiền
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$ BEGIN RAISE NOTICE '== Chính sách hoa hồng / khu vực / chủ đề / lý do hoàn tiền'; END $$;
SELECT pg_temp.purge('commission_policies', ARRAY(SELECT id FROM commission_policies WHERE name LIKE '[API TEST]%'));
-- chính sách mặc định phải còn mở (effective_to NULL) — test từng làm nó bị đặt ngày kết thúc
UPDATE commission_policies SET effective_to = NULL
WHERE id = 1 AND effective_to IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM commission_policies c WHERE c.id <> 1 AND c.cancelled = false);
SELECT pg_temp.purge('regions', ARRAY(SELECT id FROM regions WHERE name LIKE '[API TEST]%'));
SELECT pg_temp.purge('themes',  ARRAY(SELECT id FROM themes  WHERE name LIKE '[API TEST]%'));
SELECT pg_temp.purge('refund_reason_codes', ARRAY(SELECT id FROM refund_reason_codes WHERE code LIKE 'APITEST%'));

-- ═══════════════════════════════════════════════════════════════════════════════
--  8. ĐỐI TÁC TEST: hồ sơ đăng ký (#3, #4), OTP, yêu cầu đổi thông tin, tài khoản apitest*
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$ BEGIN RAISE NOTICE '== Hồ sơ đối tác + tài khoản apitest*'; END $$;
SELECT pg_temp.purge('partner_applications', ARRAY(SELECT id FROM partner_applications WHERE email LIKE 'apitest-partner%@journeygo.com'));
DELETE FROM partner_application_otps WHERE email LIKE 'apitest-partner%@journeygo.com';
SELECT pg_temp.purge('users', ARRAY(SELECT id FROM users WHERE email LIKE 'apitest%@journeygo.com'));

-- ═══════════════════════════════════════════════════════════════════════════════
--  9. TIN NHẮN / PHIÊN AI / THÔNG BÁO sinh ra trong lúc test
-- ═══════════════════════════════════════════════════════════════════════════════
DO $$ BEGIN RAISE NOTICE '== Tin nhắn, phiên AI, thông báo'; END $$;
DELETE FROM provider_messages WHERE body LIKE '[API TEST]%';
DELETE FROM booking_messages  WHERE body LIKE '[API TEST]%';
DELETE FROM ai_chat_messages  WHERE session_id IN (SELECT id FROM ai_chat_sessions WHERE user_id = 8 AND created_at >= :'test_start');
DELETE FROM ai_chat_sessions  WHERE user_id = 8 AND created_at >= :'test_start';
-- thông báo tạo ra bởi các thao tác test (đơn, thanh toán, hoàn tiền, yêu cầu tour, bài viết, hồ sơ đối tác...)
DELETE FROM notifications WHERE created_at >= :'test_start';

-- ═══════════════════════════════════════════════════════════════════════════════
--  10. BÁO CÁO: chênh lệch số dòng + kiểm tra không còn dấu vết test
-- ═══════════════════════════════════════════════════════════════════════════════
SELECT b.t AS bang, b.n AS truoc, a.n AS sau, a.n - b.n AS chenh_lech
FROM _cleanup_before b
JOIN (SELECT table_name::text AS t,
             (xpath('/row/c/text()', query_to_xml(format('select count(*) as c from %I.%I', table_schema, table_name), false, true, '')))[1]::text::bigint AS n
      FROM information_schema.tables WHERE table_schema = 'public' AND table_type = 'BASE TABLE') a USING (t)
WHERE a.n <> b.n
ORDER BY b.t;

SELECT 'còn lại (phải = 0)' AS kiem_tra,
       (SELECT count(*) FROM bookings           WHERE id BETWEEN 25 AND 35)                       AS bookings,
       (SELECT count(*) FROM payments           WHERE booking_id BETWEEN 25 AND 35)               AS payments,
       (SELECT count(*) FROM tours              WHERE tour_id BETWEEN 70 AND 76)                  AS tours,
       (SELECT count(*) FROM tour_requests      WHERE title LIKE '[API TEST]%')                   AS tour_requests,
       (SELECT count(*) FROM community_posts    WHERE title LIKE '[API TEST]%')                   AS posts,
       (SELECT count(*) FROM vouchers           WHERE code LIKE 'APITEST%')                       AS vouchers,
       (SELECT count(*) FROM users              WHERE email LIKE 'apitest%')                      AS users,
       (SELECT count(*) FROM commission_policies WHERE name LIKE '[API TEST]%')                   AS policies,
       (SELECT count(*) FROM user_points        WHERE user_id = 9)                                AS points_user9,
       (SELECT count(*) FROM notifications      WHERE created_at >= :'test_start')                AS notifications;

SELECT 'dữ liệu seed còn nguyên' AS kiem_tra,
       (SELECT count(*) FROM bookings  WHERE id BETWEEN 1 AND 24)   AS bookings_1_24,
       (SELECT count(*) FROM refund_requests WHERE refund_code LIKE 'JGSAMPLE%') AS refunds_sample,
       (SELECT effective_to IS NULL FROM commission_policies WHERE id = 1) AS default_policy_open,
       (SELECT count(*) FROM tours WHERE tour_id <= 69)             AS tours_1_69;

-- ═══════════════════════════════════════════════════════════════════════════════
--  KẾT THÚC: DRY_RUN -> ROLLBACK, chạy thật -> COMMIT
-- ═══════════════════════════════════════════════════════════════════════════════
\if :{?DRY_RUN}
    \echo '>>> DRY_RUN: ROLLBACK — không có gì bị thay đổi'
    ROLLBACK;
\else
    \echo '>>> COMMIT — đã xoá dữ liệu test'
    COMMIT;
\endif
