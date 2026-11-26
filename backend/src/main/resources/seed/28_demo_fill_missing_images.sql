-- =====================================================================================
--  28_demo_fill_missing_images.sql
--  Fill the image columns that are completely EMPTY so no card renders blank.
-- =====================================================================================
--  WHY
--    Script 27 repointed every EXISTING demo image URL to a reachable Unsplash
--    image. But some image columns were empty for ALL rows:
--      · destinations.cover_image_url -> 0 / 124 rows have a cover
--        (these are the destination cards on the admin / provider screens that
--         rendered as plain white boxes)
--      · users.avatar_url             -> 0 / 75 rows have an avatar
--        (tourist / provider avatars rendered as blank circles)
--    This script populates them using the same verified Unsplash pool, so every
--    image slot in the UI shows a real picture.
--
--  SAFETY
--    * No DELETE / TRUNCATE / DROP.
--    * Only UPDATEs of NULL image columns.
--    * Idempotent - only fills rows that are still NULL.
-- =====================================================================================

\set ON_ERROR_STOP on

DO $guard$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@journeygo.com') THEN
        RAISE EXCEPTION 'admin@journeygo.com not found - aborting for safety.';
    END IF;
END
$guard$;

CREATE TEMP TABLE tmp_img_pool (idx serial PRIMARY KEY, url text UNIQUE NOT NULL);
INSERT INTO tmp_img_pool (url) VALUES
('https://images.unsplash.com/photo-1528127269322-539801943592?w=1200&q=80'),
('https://images.unsplash.com/photo-1528181304800-259b08848526?w=1200&q=80'),
('https://images.unsplash.com/photo-1557750255-c76072a7aad1?w=1200&q=80'),
('https://images.unsplash.com/photo-1509030450996-dd1a26dda07a?w=1200&q=80'),
('https://images.unsplash.com/photo-1470004914212-05527e49370b?w=1200&q=80'),
('https://images.unsplash.com/photo-1504457047772-27faf1c00561?w=1200&q=80'),
('https://images.unsplash.com/photo-1493857671505-72967e2e2760?w=1200&q=80'),
('https://images.unsplash.com/photo-1449824913935-59a10b8d2000?w=1200&q=80'),
('https://images.unsplash.com/photo-1533929736458-ca588d08c8be?w=1200&q=80'),
('https://images.unsplash.com/photo-1512100356356-de1b84283e18?w=1200&q=80'),
('https://images.unsplash.com/photo-1583417319070-4a69db38a482?w=1200&q=80'),
('https://images.unsplash.com/photo-1544986581-efac024faf62?w=1200&q=80'),
('https://images.unsplash.com/photo-1589792923962-537704632910?w=1200&q=80'),
('https://images.unsplash.com/photo-1596402184320-417e7178b2cd?w=1200&q=80'),
('https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?w=1200&q=80'),
('https://images.unsplash.com/photo-1580795479225-c50ab8c3348d?w=1200&q=80'),
('https://images.unsplash.com/photo-1552465011-b4e21bf6e79a?w=1200&q=80'),
('https://images.unsplash.com/photo-1548013146-72479768bada?w=1200&q=80'),
('https://images.unsplash.com/photo-1524492412937-b28074a5d7da?w=1200&q=80'),
('https://images.unsplash.com/photo-1544735716-392fe2489ffa?w=1200&q=80'),
('https://images.unsplash.com/photo-1563245372-f21724e3856d?w=1200&q=80'),
('https://images.unsplash.com/photo-1512418490979-92798cec1380?w=1200&q=80'),
('https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?w=1200&q=80'),
('https://images.unsplash.com/photo-1580674285054-bed31e145f59?w=1200&q=80'),
('https://images.unsplash.com/photo-1602343168117-bb8ffe3e2e9f?w=1200&q=80'),
('https://images.unsplash.com/photo-1597211833712-5e41faa202ea?w=1200&q=80'),
('https://images.unsplash.com/photo-1600490036275-35f5f1656861?w=1200&q=80'),
('https://images.unsplash.com/photo-1540541338287-41700207dee6?w=1200&q=80'),
('https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=1200&q=80'),
('https://images.unsplash.com/photo-1578662996442-48f60103fc96?w=1200&q=80'),
('https://images.unsplash.com/photo-1516690561799-46d8f74f9abf?w=1200&q=80'),
('https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=1200&q=80'),
('https://images.unsplash.com/photo-1493780474015-ba834fd0ce2f?w=1200&q=80'),
('https://images.unsplash.com/photo-1596394516093-501ba68a0ba6?w=1200&q=80'),
('https://images.unsplash.com/photo-1518684079-3c830dcef090?w=1200&q=80'),
('https://images.unsplash.com/photo-1565967511849-76a60a516170?w=1200&q=80'),
('https://images.unsplash.com/photo-1502139214982-d0ad755818d8?w=1200&q=80');

CREATE OR REPLACE FUNCTION pg_temp.pick_img(key text) RETURNS text
LANGUAGE sql STABLE AS $$
    SELECT url FROM tmp_img_pool
     WHERE idx = 1 + (abs(hashtext(key)) % (SELECT count(*) FROM tmp_img_pool));
$$;

-- ── D1. destinations.cover_image_url ───────────────────────────────────────────
DO $d1$
DECLARE v_fixed integer := 0;
BEGIN
    UPDATE destinations d
       SET cover_image_url = pg_temp.pick_img('dest-' || d.id::text),
           updated_at = now()
     WHERE d.cover_image_url IS NULL
        OR btrim(d.cover_image_url) = '';
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 28] D1. destinations.cover_image_url: % row(s) filled.', v_fixed;
END
$d1$;

-- ── D2. users.avatar_url ───────────────────────────────────────────────────────
DO $d2$
DECLARE v_fixed integer := 0;
BEGIN
    UPDATE users u
       SET avatar_url = pg_temp.pick_img('avatar-' || u.id::text),
           updated_at = now()
     WHERE u.avatar_url IS NULL
        OR btrim(u.avatar_url) = '';
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 28] D2. users.avatar_url: % row(s) filled.', v_fixed;
END
$d2$;

-- ── D3. users.cover_image_url (ảnh bìa trang cá nhân) ──────────────────────────
DO $d3$
DECLARE v_fixed integer := 0;
BEGIN
    UPDATE users u
       SET cover_image_url = pg_temp.pick_img('ucover-' || u.id::text),
           updated_at = now()
     WHERE u.cover_image_url IS NULL
        OR btrim(u.cover_image_url) = '';
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 28] D3. users.cover_image_url: % row(s) filled.', v_fixed;
END
$d3$;

-- ── D4. provider_profiles: ảnh đại diện đối tác nếu có cột ─────────────────────
DO $d4$
DECLARE v_fixed integer := 0;
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
                WHERE table_name = 'provider_profiles'
                  AND column_name = 'avatar_url') THEN
        UPDATE provider_profiles p
           SET avatar_url = pg_temp.pick_img('pavatar-' || p.id::text)
         WHERE p.avatar_url IS NULL
            OR btrim(p.avatar_url) = '';
        GET DIAGNOSTICS v_fixed = ROW_COUNT;
        RAISE NOTICE '[Repair 28] D4. provider_profiles.avatar_url: % row(s) filled.', v_fixed;
    ELSE
        RAISE NOTICE '[Repair 28] D4. provider_profiles has no avatar_url - skipped.';
    END IF;
END
$d4$;

-- ── D5. tours.cover_image_url — các tour DRAFT còn trống (để không card trắng) ────
DO $d5$
DECLARE v_fixed integer := 0;
BEGIN
    UPDATE tours t
       SET cover_image_url = pg_temp.pick_img('tour-cover-' || t.tour_id::text),
           updated_at = now()
     WHERE t.cover_image_url IS NULL
        OR btrim(t.cover_image_url) = '';
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 28] D5. tours.cover_image_url: % row(s) filled.', v_fixed;
END
$d5$;

-- ── D6. Chuẩn hoá host ảnh về images.unsplash.com ───────────────────────────────
--      next/image chỉ whitelist remotePatterns; giữ mọi URL trong 1 host đã
--      được khai báo (images.unsplash.com) để ảnh không bao giờ bị chặn.
DO $d6$
DECLARE v_fixed integer := 0;
BEGIN
    UPDATE tour_images ti
       SET image_url = pg_temp.pick_img('tour-img-' || ti.tour_id::text || '-' || ti.image_url)
     WHERE ti.image_url LIKE '%picsum.photos%';
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 28] D6a. tour_images: % row(s) repointed.', v_fixed;

    UPDATE tour_stops s
       SET image_url = pg_temp.pick_img('stop-' || s.tour_id::text || '-' || s.sequence_order::text),
           updated_at = now()
     WHERE s.image_url LIKE '%picsum.photos%';
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 28] D6b. tour_stops: % row(s) repointed.', v_fixed;

    UPDATE tour_stop_artifacts a
       SET image_url = pg_temp.pick_img('artifact-' || a.stop_id::text || '-' || a.name)
     WHERE a.image_url LIKE '%picsum.photos%';
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 28] D6c. tour_stop_artifacts: % row(s) repointed.', v_fixed;

    UPDATE tour_stop_cultural_images c
       SET image_url = pg_temp.pick_img('cultural-' || c.stop_id::text || '-' || c.image_url)
     WHERE c.image_url LIKE '%picsum.photos%';
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 28] D6d. tour_stop_cultural_images: % row(s) repointed.', v_fixed;

    UPDATE tours t
       SET cover_image_url = pg_temp.pick_img('tour-cover-' || t.tour_id::text),
           updated_at = now()
     WHERE t.cover_image_url LIKE '%picsum.photos%';
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 28] D6e. tours: % row(s) repointed.', v_fixed;
END
$d6$;

-- =====================================================================================
--  VERIFY
-- =====================================================================================
\echo '-- V1. Do phu truong anh (dang NULL = 0) --'
SELECT 'destinations.cover' AS col, count(*) AS null_cnt FROM destinations WHERE cover_image_url IS NULL OR btrim(cover_image_url)=''
UNION ALL SELECT 'users.avatar_url', count(*) FROM users WHERE avatar_url IS NULL OR btrim(avatar_url)=''
UNION ALL SELECT 'users.cover_image_url', count(*) FROM users WHERE cover_image_url IS NULL OR btrim(cover_image_url)=''
UNION ALL SELECT 'tours.cover', count(*) FROM tours WHERE cover_image_url IS NULL OR btrim(cover_image_url)=''
UNION ALL SELECT 'regions.image_url', count(*) FROM regions WHERE image_url IS NULL OR btrim(image_url)='';

\echo '-- V2. Khong con URL anh tren host chet --'
SELECT 'journeygo-demo' AS host, (SELECT count(*) FROM tours WHERE cover_image_url LIKE '%journeygo-demo%')
                      + (SELECT count(*) FROM tour_images WHERE image_url LIKE '%journeygo-demo%')
                      + (SELECT count(*) FROM tour_stops WHERE image_url LIKE '%journeygo-demo%')
                      + (SELECT count(*) FROM refund_requests WHERE evidence_attachments LIKE '%journeygo-demo%') AS cnt
UNION ALL
SELECT 'img.journeygo.com', (SELECT count(*) FROM tours WHERE cover_image_url LIKE '%img.journeygo%')
                      + (SELECT count(*) FROM tour_images WHERE image_url LIKE '%img.journeygo%') AS cnt;
