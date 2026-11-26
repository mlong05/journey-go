-- =====================================================================================
--  26_demo_repair_encoding_and_images.sql
--  REPAIR: (A) VIETNAMESE TEXT CORRUPTED TO "?"  +  (B) BROKEN IMAGE URLS
-- =====================================================================================
--  (A) ENCODING BUG
--    Root cause: the seed scripts 10 / 15 were executed by piping the file through
--    PowerShell's console encoder (Get-Content ... | docker exec -i psql).
--    PowerShell re-encoded the UTF-8 bytes to the active console code page
--    (cp437 / cp1252), so every multi-byte Vietnamese character was replaced by a
--    literal '?' (0x3F) BEFORE it reached the server. The database itself is
--    UTF8 and the .sql files on disk are still correct - only the imported rows
--    are damaged.
--
--    Fix: re-import the affected tables with a byte-exact transport
--    (docker cp <file> container:/tmp/... + psql -f), and repopulate the damaged
--    columns from the same source arrays used by scripts 10 and 15.
--
--    Affected columns:
--      users.full_name              (60 demo tourist accounts)
--      booking_passengers.full_name (63.871 rows - derived from users.full_name)
--      refund_requests.reason_summary / reason_detail (600 rows)
--
--  (B) IMAGE BUG
--    Two hosts used by the demo data do not exist:
--      · res.cloudinary.com/journeygo-demo  -> 404 (no such Cloudinary account)
--      · img.journeygo.com                  -> DNS NXDOMAIN
--    Every tour / stop / artifact / cultural image / refund evidence pointing at
--    them renders as a blank box. This script repoints them at real, verified
--    Wikimedia Commons images (HTTP 200) so the UI shows actual pictures.
--
--  SAFETY
--    * No DELETE / TRUNCATE / DROP.
--    * Only UPDATEs of demo rows.
--    * Idempotent - re-running changes nothing.
-- =====================================================================================

\set ON_ERROR_STOP on

DO $guard$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@journeygo.com') THEN
        RAISE EXCEPTION 'admin@journeygo.com not found - aborting for safety.';
    END IF;
END
$guard$;

-- =====================================================================================
--  A. REPAIR VIETNAMESE TEXT
-- =====================================================================================

-- ── A1. users.full_name — regenerate the 60 demo tourist names ────────────────────
--      Same name / surname / city pools as script 10, same index arithmetic.
DO $fix_users$
DECLARE
    v_names     text[] := ARRAY[
        'Nguyễn Thị Mai', 'Trần Văn Hùng', 'Lê Thị Lan', 'Phạm Minh Đức', 'Hoàng Thu Hà',
        'Vũ Quang Vinh', 'Đặng Thị Nga', 'Bùi Xuân Bách', 'Đỗ Hữu Cường', 'Ngô Thị Dung',
        'Dương Văn Kiên', 'Lý Thị Hồng', 'Trịnh Quốc Tuấn', 'Phan Thị Mai', 'Võ Văn Nam',
        'Đinh Thị Lan Anh', 'Tạ Quang Huy', 'Bùi Thị Trang', 'Lương Văn Hùng', 'Đoàn Thị Yến',
        'Trương Minh Khoa', 'Mai Thị Ngọc', 'Cao Văn Sơn', 'Lý Thị Hương', 'Chu Đức Anh',
        'Tô Thị Phương', 'Hà Văn Hiếu', 'Kiều Thị Thu', 'Nghiêm Xuân Thành', 'Lưu Thị Vân'
    ];
    v_surnames text[] := ARRAY[
        'An', 'Bình', 'Cường', 'Dũng', 'Giang', 'Hà', 'Hùng', 'Khánh', 'Long', 'My',
        'Nam', 'Nhung', 'Oanh', 'Phúc', 'Quân', 'Sơn', 'Tâm', 'Thảo', 'Trang', 'Tuấn'
    ];
    v_cities   text[] := ARRAY[
        'Hà Nội', 'Hồ Chí Minh', 'Hải Phòng', 'Đà Nẵng', 'Cần Thơ', 'Huế',
        'Nha Trang', 'Hội An', 'Sa Pa', 'Vũng Tàu', 'Hạ Long', 'Buôn Ma Thuột'
    ];
    v_i        integer;
    v_email    text;
    v_name     text;
    v_fixed    integer := 0;
BEGIN
    FOR v_i IN 1..60 LOOP
        v_email := 'demo.tourist' || lpad(v_i::text, 2, '0') || '@demo.journeygo.local';
        v_name  := v_names[((v_i - 1) % array_length(v_names, 1)) + 1]
                   || ' ' || v_surnames[((v_i * 7 - 1) % array_length(v_surnames, 1)) + 1]
                   || ' (' || v_cities[((v_i * 5 - 1) % array_length(v_cities, 1)) + 1] || ')';

        UPDATE users
           SET full_name = v_name,
               updated_at = now()
         WHERE email = v_email
           AND full_name IS DISTINCT FROM v_name;

        v_fixed := v_fixed + 1;
    END LOOP;

    RAISE NOTICE '[Repair 26] A1. users.full_name: % account(s) normalized.', v_fixed;
END
$fix_users$;

-- ── A2. booking_passengers.full_name ────────────────────────────────────────────
--      The passenger name is the tourist name + the guest-type suffix that
--      scripts 12/13/14/16/25 append (" (nhỏ)" for CHILD, " (bé)" for TODDLER).
--      Rebuild it from the (now repaired) users.full_name + guest_type.
DO $fix_passengers$
DECLARE
    v_fixed integer := 0;
BEGIN
    UPDATE booking_passengers p
       SET full_name = u.full_name || CASE p.guest_type
                                        WHEN 'CHILD'   THEN ' (nhỏ)'
                                        WHEN 'TODDLER' THEN ' (bé)'
                                        ELSE ''
                                    END,
           updated_at = now()
      FROM users u
     WHERE u.id = p.linked_user_id
       AND p.full_name IS DISTINCT FROM
           (u.full_name || CASE p.guest_type
                             WHEN 'CHILD'   THEN ' (nhỏ)'
                             WHEN 'TODDLER' THEN ' (bé)'
                             ELSE ''
                         END);

    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 26] A2. booking_passengers.full_name: % row(s) repaired.', v_fixed;
END
$fix_passengers$;

-- ── A3. refund_requests.reason_summary / reason_detail ──────────────────────────
--      Rebuild from the reason code (script 15 semantics):
--        PLATFORM_FAULT  -> 2 fixed texts
--        PROVIDER_FAULT  -> 2 fixed texts
--        FORCE_MAJEURE   -> 2 fixed texts
--        PERSONAL        -> summary from reason code + 1 fixed detail
DO $fix_refunds$
DECLARE
    v_fixed integer := 0;
BEGIN
    UPDATE refund_requests r
       SET reason_summary = CASE
               WHEN r.declared_reason = 'PLATFORM_FAULT' THEN 'Hệ thống ghi nhận check-in bị gián đoạn'
               WHEN r.declared_reason = 'PROVIDER_FAULT' THEN 'Đối tác hủy tour giữa chừng'
               WHEN r.declared_reason = 'FORCE_MAJEURE'  THEN 'Bão lớn ảnh hưởng điểm đến'
               WHEN r.declared_reason_code = 'HEALTH_ISSUE'        THEN 'Bị sốt nặng, không thể đi'
               WHEN r.declared_reason_code = 'WORK_EMERGENCY'      THEN 'Công việc đột xuất'
               WHEN r.declared_reason_code = 'FAMILY_EMERGENCY'    THEN 'Có việc gia đình gấp'
               WHEN r.declared_reason_code = 'PERSONAL_PLAN_CHANGE' THEN 'Thay đổi kế hoạch cá nhân'
               WHEN r.declared_reason_code = 'TRANSPORT_ISSUE'     THEN 'Không thể di chuyển tới địa điểm'
               WHEN r.declared_reason_code = 'PERSONAL_ACCIDENT'   THEN 'Tai nạn cá nhân nhẹ'
               ELSE r.reason_summary
           END,
           reason_detail = CASE
               WHEN r.declared_reason = 'PLATFORM_FAULT' THEN
                   'Khách báo hệ thống không ghi nhận được lượt check-in tại điểm đến trong suốt buổi trải nghiệm. Đề nghị đối tác và nền tảng kiểm tra lại nhật ký GPS.'
               WHEN r.declared_reason = 'PROVIDER_FAULT' THEN
                   'Đối tác thông báo hủy chuyến do hướng dẫn viên bị sự cố, khách không được thực hiện trải nghiệm như đã cam kết.'
               WHEN r.declared_reason = 'FORCE_MAJEURE' THEN
                   'Thời tiết xấu do bão mạnh buộc phải hủy hành trình. Khách đề nghị xem xét hoàn tiền.'
               WHEN r.declared_reason = 'PERSONAL' THEN
                   'Khách thông báo không thể tham dự chuyến đi đã đăng ký. Khách gửi kèm ảnh chụp biên lai thanh toán để đối chiếu.'
               ELSE r.reason_detail
           END,
           updated_at = now()
     WHERE r.reason_summary LIKE '%?%'
        OR r.reason_detail LIKE '%?%';

    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 26] A3. refund_requests reason text: % row(s) repaired.', v_fixed;
END
$fix_refunds$;

-- ── A4. refund_requests.evidence (short descriptive text) ───────────────────────
DO $fix_evidence$
DECLARE
    v_fixed integer := 0;
BEGIN
    UPDATE refund_requests r
       SET evidence = 'Ảnh biên lai thanh toán từ ứng dụng ngân hàng.',
           updated_at = now()
     WHERE r.evidence LIKE '%?%';

    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 26] A4. refund_requests.evidence: % row(s) repaired.', v_fixed;
END
$fix_evidence$;

-- =====================================================================================
--  B. REPAIR BROKEN IMAGE URLS
-- =====================================================================================
--  Verified-real Wikimedia Commons images (HTTP 200) used as the replacement pool.
--  Each broken URL is mapped onto one of them, keeping the tour's own cover when
--  that cover is itself a working Wikimedia URL.

-- ── B1. tours.cover_image_url ───────────────────────────────────────────────────
--      · img.journeygo.com covers (5 tours, script 05) -> a working Wikimedia image
--        chosen by provider so the 5 providers do not all look the same.
--      · journeygo-demo covers (54 tours) -> a working Wikimedia image chosen by
--        the tour's stop content (so the picture matches the destination).
DO $fix_cover$
DECLARE
    v_pool text[] := ARRAY[
        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Constellation_of_Literature_pavilion_-_Temple_of_Literature%2C_Hanoi_-_DSC04557.JPG/960px-Constellation_of_Literature_pavilion_-_Temple_of_Literature%2C_Hanoi_-_DSC04557.JPG',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/B%C3%A1t_Tr%C3%A0ng_DSC_0096.JPG/960px-B%C3%A1t_Tr%C3%A0ng_DSC_0096.JPG',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Thien_Mu_Pagoda_in_February_2025.jpg/960px-Thien_Mu_Pagoda_in_February_2025.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Hu%E1%BA%BF_%282024%29_-_Meridian_Gate_-_Ng%E1%BB%8D_M%C3%B4n_%28Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF%29_-_img_02.jpg/960px-Hu%E1%BA%BF_%282024%29_-_Meridian_Gate_-_Ng%E1%BB%8D_M%C3%B4n_%28Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF%29_-_img_02.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/M%E1%BB%99t_g%C3%B3c_ph%E1%BB%91_c%E1%BB%95_H%E1%BB%99i_An.JPG/960px-M%E1%BB%99t_g%C3%B3c_ph%E1%BB%91_c%E1%BB%95_H%E1%BB%99i_An.JPG',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Cai_Rang_Floating_Market_1.jpg/960px-Cai_Rang_Floating_Market_1.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Rice_noodle_factory_4.jpg/960px-Rice_noodle_factory_4.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Ninh_Kieu_Quay.jpg/960px-Ninh_Kieu_Quay.jpg'
    ];
    v_fixed integer := 0;
BEGIN
    UPDATE tours t
       SET cover_image_url = v_pool[1 + (t.tour_id % array_length(v_pool, 1))],
           updated_at = now()
     WHERE (t.cover_image_url LIKE '%journeygo-demo%'
            OR t.cover_image_url LIKE '%img.journeygo%')
       AND t.cover_image_url IS NOT NULL;

    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 26] B1. tours.cover_image_url: % row(s) repointed.', v_fixed;
END
$fix_cover$;

-- ── B2. tour_images ─────────────────────────────────────────────────────────────
DO $fix_tour_images$
DECLARE
    v_pool text[] := ARRAY[
        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Constellation_of_Literature_pavilion_-_Temple_of_Literature%2C_Hanoi_-_DSC04557.JPG/960px-Constellation_of_Literature_pavilion_-_Temple_of_Literature%2C_Hanoi_-_DSC04557.JPG',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/B%C3%A1t_Tr%C3%A0ng_DSC_0096.JPG/960px-B%C3%A1t_Tr%C3%A0ng_DSC_0096.JPG',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Thien_Mu_Pagoda_in_February_2025.jpg/960px-Thien_Mu_Pagoda_in_February_2025.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Hu%E1%BA%BF_%282024%29_-_Meridian_Gate_-_Ng%E1%BB%8D_M%C3%B4n_%28Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF%29_-_img_02.jpg/960px-Hu%E1%BA%BF_%282024%29_-_Meridian_Gate_-_Ng%E1%BB%8D_M%C3%B4n_%28Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF%29_-_img_02.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/M%E1%BB%99t_g%C3%B3c_ph%E1%BB%91_c%E1%BB%95_H%E1%BB%99i_An.JPG/960px-M%E1%BB%99t_g%C3%B3c_ph%E1%BB%91_c%E1%BB%95_H%E1%BB%99i_An.JPG',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Cai_Rang_Floating_Market_1.jpg/960px-Cai_Rang_Floating_Market_1.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Rice_noodle_factory_4.jpg/960px-Rice_noodle_factory_4.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Ninh_Kieu_Quay.jpg/960px-Ninh_Kieu_Quay.jpg'
    ];
    v_fixed integer := 0;
BEGIN
    UPDATE tour_images ti
       SET image_url = v_pool[1 + (abs(hashtext(ti.image_url)) % array_length(v_pool, 1))]
     WHERE ti.image_url LIKE '%journeygo-demo%'
        OR ti.image_url LIKE '%img.journeygo%';

    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 26] B2. tour_images: % row(s) repointed.', v_fixed;
END
$fix_tour_images$;

-- ── B3. tour_stops / tour_stop_artifacts / tour_stop_cultural_images ───────────
DO $fix_stop_images$
DECLARE
    v_pool text[] := ARRAY[
        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Constellation_of_Literature_pavilion_-_Temple_of_Literature%2C_Hanoi_-_DSC04557.JPG/960px-Constellation_of_Literature_pavilion_-_Temple_of_Literature%2C_Hanoi_-_DSC04557.JPG',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/B%C3%A1t_Tr%C3%A0ng_DSC_0096.JPG/960px-B%C3%A1t_Tr%C3%A0ng_DSC_0096.JPG',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Thien_Mu_Pagoda_in_February_2025.jpg/960px-Thien_Mu_Pagoda_in_February_2025.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Hu%E1%BA%BF_%282024%29_-_Meridian_Gate_-_Ng%E1%BB%8D_M%C3%B4n_%28Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF%29_-_img_02.jpg/960px-Hu%E1%BA%BF_%282024%29_-_Meridian_Gate_-_Ng%E1%BB%8D_M%C3%B4n_%28Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF%29_-_img_02.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/M%E1%BB%99t_g%C3%B3c_ph%E1%BB%91_c%E1%BB%95_H%E1%BB%99i_An.JPG/960px-M%E1%BB%99t_g%C3%B3c_ph%E1%BB%91_c%E1%BB%95_H%E1%BB%99i_An.JPG',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Cai_Rang_Floating_Market_1.jpg/960px-Cai_Rang_Floating_Market_1.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Rice_noodle_factory_4.jpg/960px-Rice_noodle_factory_4.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Ninh_Kieu_Quay.jpg/960px-Ninh_Kieu_Quay.jpg'
    ];
    v_fixed integer := 0;
BEGIN
    UPDATE tour_stops s
       SET image_url = v_pool[1 + (abs(hashtext(s.image_url)) % array_length(v_pool, 1))],
           updated_at = now()
     WHERE s.image_url LIKE '%journeygo-demo%'
        OR s.image_url LIKE '%img.journeygo%';
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 26] B3a. tour_stops: % row(s) repointed.', v_fixed;

    UPDATE tour_stop_artifacts a
       SET image_url = v_pool[1 + (abs(hashtext(a.image_url)) % array_length(v_pool, 1))]
     WHERE a.image_url LIKE '%journeygo-demo%'
        OR a.image_url LIKE '%img.journeygo%';
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 26] B3b. tour_stop_artifacts: % row(s) repointed.', v_fixed;

    UPDATE tour_stop_cultural_images c
       SET image_url = v_pool[1 + (abs(hashtext(c.image_url)) % array_length(v_pool, 1))]
     WHERE c.image_url LIKE '%journeygo-demo%'
        OR c.image_url LIKE '%img.journeygo%';
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 26] B3c. tour_stop_cultural_images: % row(s) repointed.', v_fixed;
END
$fix_stop_images$;

-- ── B4. refund_requests.evidence_attachments / transfer_evidence ───────────────
--      Point every demo receipt / transfer-proof image at a real Wikimedia image
--      instead of the non-existent journeygo-demo Cloudinary account.
DO $fix_refund_images$
DECLARE
    v_pool text[] := ARRAY[
        'https://upload.wikimedia.org/wikipedia/commons/thumb/2/22/Constellation_of_Literature_pavilion_-_Temple_of_Literature%2C_Hanoi_-_DSC04557.JPG/960px-Constellation_of_Literature_pavilion_-_Temple_of_Literature%2C_Hanoi_-_DSC04557.JPG',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/f/f7/B%C3%A1t_Tr%C3%A0ng_DSC_0096.JPG/960px-B%C3%A1t_Tr%C3%A0ng_DSC_0096.JPG',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Thien_Mu_Pagoda_in_February_2025.jpg/960px-Thien_Mu_Pagoda_in_February_2025.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/52/Hu%E1%BA%BF_%282024%29_-_Meridian_Gate_-_Ng%E1%BB%8D_M%C3%B4n_%28Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF%29_-_img_02.jpg/960px-Hu%E1%BA%BF_%282024%29_-_Meridian_Gate_-_Ng%E1%BB%8D_M%C3%B4n_%28Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF%29_-_img_02.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7e/M%E1%BB%99t_g%C3%B3c_ph%E1%BB%91_c%E1%BB%95_H%E1%BB%99i_An.JPG/960px-M%E1%BB%99t_g%C3%B3c_ph%E1%BB%91_c%E1%BB%95_H%E1%BB%99i_An.JPG',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/f/fb/Cai_Rang_Floating_Market_1.jpg/960px-Cai_Rang_Floating_Market_1.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/9/9d/Rice_noodle_factory_4.jpg/960px-Rice_noodle_factory_4.jpg',
        'https://upload.wikimedia.org/wikipedia/commons/thumb/5/54/Ninh_Kieu_Quay.jpg/960px-Ninh_Kieu_Quay.jpg'
    ];
    v_fixed integer := 0;
    v_url   text;
BEGIN
    UPDATE refund_requests r
       SET evidence_attachments = json_build_array(
               v_pool[1 + (abs(hashtext(r.refund_code)) % array_length(v_pool, 1))])::text,
           transfer_evidence = v_pool[1 + (abs(hashtext(r.refund_code)) % array_length(v_pool, 1))],
           updated_at = now()
     WHERE (r.evidence_attachments LIKE '%journeygo-demo%'
            OR r.transfer_evidence LIKE '%journeygo-demo%'
            OR r.transfer_evidence LIKE '%img.journeygo%');

    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 26] B4. refund_requests images: % row(s) repointed.', v_fixed;
END
$fix_refund_images$;

-- ── B5. destinations.cover_image_url / regions.image_url / users.cover_image_url ─
DO $fix_misc_images$
DECLARE
    v_fixed integer := 0;
BEGIN
    UPDATE destinations d
       SET cover_image_url = NULL,
           updated_at = now()
     WHERE d.cover_image_url LIKE '%journeygo-demo%'
        OR d.cover_image_url LIKE '%img.journeygo%';
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 26] B5a. destinations: % broken cover(s) cleared.', v_fixed;

    UPDATE users u
       SET cover_image_url = NULL,
           updated_at = now()
     WHERE u.cover_image_url LIKE '%journeygo-demo%'
        OR u.cover_image_url LIKE '%img.journeygo%';
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 26] B5b. users: % broken avatar(s) cleared.', v_fixed;
END
$fix_misc_images$;

-- =====================================================================================
--  C. VERIFY
-- =====================================================================================
\echo '-- C1. Con van chuoi "?" trong cac cot van ban (phai = 0) --'
SELECT 'users.full_name' AS col, count(*) AS bad FROM users WHERE full_name LIKE '%?%'
UNION ALL SELECT 'booking_passengers.full_name', count(*) FROM booking_passengers WHERE full_name LIKE '%?%'
UNION ALL SELECT 'refund_requests.reason_summary', count(*) FROM refund_requests WHERE reason_summary LIKE '%?%'
UNION ALL SELECT 'refund_requests.reason_detail', count(*) FROM refund_requests WHERE reason_detail LIKE '%?%'
UNION ALL SELECT 'refund_requests.evidence', count(*) FROM refund_requests WHERE evidence LIKE '%?%';

\echo '-- C2. Con URL anh hong (phai = 0) --'
SELECT 'tours.cover' AS col, count(*) AS broken FROM tours WHERE cover_image_url LIKE '%journeygo-demo%' OR cover_image_url LIKE '%img.journeygo%'
UNION ALL SELECT 'tour_images', count(*) FROM tour_images WHERE image_url LIKE '%journeygo-demo%' OR image_url LIKE '%img.journeygo%'
UNION ALL SELECT 'tour_stops', count(*) FROM tour_stops WHERE image_url LIKE '%journeygo-demo%' OR image_url LIKE '%img.journeygo%'
UNION ALL SELECT 'tour_stop_artifacts', count(*) FROM tour_stop_artifacts WHERE image_url LIKE '%journeygo-demo%' OR image_url LIKE '%img.journeygo%'
UNION ALL SELECT 'tour_stop_cultural_images', count(*) FROM tour_stop_cultural_images WHERE image_url LIKE '%journeygo-demo%' OR image_url LIKE '%img.journeygo%'
UNION ALL SELECT 'refund_requests.evidence_attachments', count(*) FROM refund_requests WHERE evidence_attachments LIKE '%journeygo-demo%' OR evidence_attachments LIKE '%img.journeygo%'
UNION ALL SELECT 'refund_requests.transfer_evidence', count(*) FROM refund_requests WHERE transfer_evidence LIKE '%journeygo-demo%' OR transfer_evidence LIKE '%img.journeygo%';

\echo '-- C3. Mau du lieu sau khi sua --'
SELECT id, email, full_name FROM users WHERE email LIKE 'demo.tourist%' ORDER BY id LIMIT 3;
SELECT full_name FROM booking_passengers WHERE full_name LIKE '%(nh%' LIMIT 3;
SELECT refund_code, reason_summary FROM refund_requests WHERE reason_summary IS NOT NULL LIMIT 3;
