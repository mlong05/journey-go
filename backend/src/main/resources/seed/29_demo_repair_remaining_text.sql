-- =====================================================================================
--  29_demo_repair_remaining_text.sql
--  Last pass of the encoding repair: the columns the DB-wide scan still flagged.
-- =====================================================================================
--  WHY
--    Script 26 fixed users / booking_passengers / refund reason texts, but the
--    full-database scan (scripts/tmp_scan_questionmark.sql) still found a few
--    columns whose Vietnamese was destroyed by the same PowerShell pipe:
--
--      · refund_requests.bank_account_name  (600 rows)
--          seed 15 builds it as 'Nguyễn ' || tourist_id || ' Vân'
--      · notifications.title / .body         (9 rows)
--          PaymentService sends
--            title: "Thanh toán thành công"
--            body : "Đơn <code> — <tour> <date> đã được xác nhận.
--                    Chúc bạn một hành trình thật đáng nhớ!"
--      · demo_seed_checkpoints.note          (2 rows)  -- only a bookkeeping note
--
--    Everything else the scan reported is a FALSE POSITIVE: a '?' inside a URL
--    query string (https://images.unsplash.com/...?w=1200&q=80), not corruption.
--
--  SAFETY
--    * No DELETE / TRUNCATE / DROP.
--    * Only UPDATEs.
--    * Idempotent.
-- =====================================================================================

\set ON_ERROR_STOP on

DO $guard$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@journeygo.com') THEN
        RAISE EXCEPTION 'admin@journeygo.com not found - aborting for safety.';
    END IF;
END
$guard$;

-- ── E1. refund_requests.bank_account_name ──────────────────────────────────────
DO $e1$
DECLARE v_fixed integer := 0;
BEGIN
    UPDATE refund_requests r
       SET bank_account_name = 'Nguyễn ' || r.tourist_id::text || ' Vân',
           updated_at = now()
     WHERE r.bank_account_name LIKE '%?%';
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 29] E1. refund_requests.bank_account_name: % row(s) repaired.', v_fixed;
END
$e1$;

-- ── E2. notifications.title ────────────────────────────────────────────────────
DO $e2$
DECLARE v_fixed integer := 0;
BEGIN
    UPDATE notifications n
       SET title = 'Thanh toán thành công'
     WHERE n.title LIKE '%?%';
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 29] E2. notifications.title: % row(s) repaired.', v_fixed;
END
$e2$;

-- ── E3. notifications.body ─────────────────────────────────────────────────────
--      "Đơn <booking code> — <tour title> <date> đã được xác nhận.
--       Chúc bạn một hành trình thật đáng nhớ!"
--      The booking code is recoverable from the body's first token (e.g. JGTEST...).
DO $e3$
DECLARE
    v_fixed  integer := 0;
    v_code   text;
    v_body   text;
    v_row    record;
BEGIN
    FOR v_row IN
        SELECT n.id, n.body, b.booking_code, b.experience_date, t.title AS tour_title
          FROM notifications n
          LEFT JOIN bookings b
                 ON b.booking_code = substring(n.body FROM 'JGT?EST[0-9A-Z]+')
                 OR b.booking_code = substring(n.body FROM 'JGT[A-Z]*[0-9A-Z]+')
          LEFT JOIN tours t ON t.tour_id = b.tour_id
         WHERE n.body LIKE '%?%'
    LOOP
        v_code := v_row.booking_code;

        IF v_code IS NOT NULL THEN
            v_body := 'Đơn ' || v_code || ' — ' || coalesce(v_row.tour_title, 'chuyến đi của bạn')
                      || ' ngày ' || to_char(v_row.experience_date, 'DD/MM/YYYY')
                      || ' đã được xác nhận. Chúc bạn một hành trình thật đáng nhớ!';
        ELSE
            v_body := 'Đơn của bạn đã được xác nhận. Chúc bạn một hành trình thật đáng nhớ!';
        END IF;

        UPDATE notifications
           SET body = v_body
         WHERE id = v_row.id;
        v_fixed := v_fixed + 1;
    END LOOP;

    RAISE NOTICE '[Repair 29] E3. notifications.body: % row(s) repaired.', v_fixed;
END
$e3$;

-- ── E4. demo_seed_checkpoints.note (ghi chú sổ tay, không ảnh hưởng dữ liệu) ──
DO $e4$
DECLARE v_fixed integer := 0;
BEGIN
    UPDATE demo_seed_checkpoints c
       SET note = CASE c.script_name
                    WHEN '10_demo_history_common' THEN
                        'Nền tảng: bảng checkpoint/registry + 60 Tourist giả lập + hàm helper mới.'
                    WHEN '15_demo_history_refunds' THEN
                        'Yêu cầu hoàn tiền PENDING_REVIEW cho Admin duyệt qua API (script 17).'
                    ELSE c.note
                END
     WHERE c.note LIKE '%?%';
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 29] E4. demo_seed_checkpoints.note: % row(s) repaired.', v_fixed;
END
$e4$;

-- =====================================================================================
--  VERIFY — full DB scan, ignoring URL query strings
-- =====================================================================================
\echo '-- V1. Cac con chuoi "?" that su con lai (phai = 0) --'
SELECT 'refund_requests.bank_account_name' AS col, count(*) AS bad FROM refund_requests WHERE bank_account_name LIKE '%?%'
UNION ALL SELECT 'notifications.title', count(*) FROM notifications WHERE title LIKE '%?%'
UNION ALL SELECT 'notifications.body', count(*) FROM notifications WHERE body LIKE '%?%'
UNION ALL SELECT 'demo_seed_checkpoints.note', count(*) FROM demo_seed_checkpoints WHERE note LIKE '%?%';

\echo '-- V2. Mau du lieu sau khi sua --'
SELECT id, title, body FROM notifications WHERE id IN (36,37) ORDER BY id;
SELECT DISTINCT bank_account_name FROM refund_requests WHERE bank_account_name LIKE 'Nguy%' ORDER BY 1 LIMIT 5;
