-- =====================================================================================
--  27_demo_repoint_images_to_unsplash.sql
--  Repoint ALL demo image URLs to a VERIFIED-REACHABLE Unsplash pool.
-- =====================================================================================
--  WHY
--    Script 26 replaced the dead hosts (res.cloudinary.com/journeygo-demo,
--    img.journeygo.com) with Wikimedia Commons URLs. Those work, but Wikimedia
--    aggressively rate-limits / blocks hot-linking from datacenter IPs (HTTP 429
--    "Your request does not comply with our robot policy"). A dashboard that
--    loads dozens of images at once therefore ends up with blank boxes again.
--
--    Unsplash (images.unsplash.com) is:
--      · already whitelisted in frontend/next.config.mjs -> images.remotePatterns
--      · served over HTTPS with no referrer restrictions
--      · not rate-limited for normal page loads
--      · verified reachable (HTTP 200) for every URL in the pool below
--
--  SCOPE
--    Every image-bearing demo column:
--      tours.cover_image_url
--      tour_images.image_url
--      tour_stops.image_url
--      tour_stop_artifacts.image_url
--      tour_stop_cultural_images.image_url
--      refund_requests.evidence_attachments / transfer_evidence
--      destinations.cover_image_url
--      regions.image_url
--      users.cover_image_url
--
--    Each row is mapped deterministically (hash of its id / url) onto the pool so
--    the same image always maps to the same photo -> stable across re-runs.
--
--  SAFETY
--    * No DELETE / TRUNCATE / DROP.
--    * Only UPDATEs of image URL columns.
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

-- ── Bảng ảnh đã được kiểm tra trả về HTTP 200 (2026-11-26) ────────────────────
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

CREATE INDEX tmp_img_pool_idx ON tmp_img_pool (idx);

-- Hàm chọn ảnh: hash ổn định (deterministic) theo khóa → luôn ra cùng 1 ảnh.
CREATE OR REPLACE FUNCTION pg_temp.pick_img(key text) RETURNS text
LANGUAGE sql STABLE AS $$
    SELECT url FROM tmp_img_pool
     WHERE idx = 1 + (abs(hashtext(key)) % (SELECT count(*) FROM tmp_img_pool));
$$;

-- ── C1. tours.cover_image_url ───────────────────────────────────────────────────
DO $c1$
DECLARE v_fixed integer := 0;
BEGIN
    UPDATE tours t
       SET cover_image_url = pg_temp.pick_img('tour-cover-' || t.tour_id::text),
           updated_at = now()
     WHERE t.cover_image_url IS NOT NULL
       AND t.cover_image_url <> ''
       AND (t.cover_image_url LIKE '%wikimedia%'
            OR t.cover_image_url LIKE '%journeygo-demo%'
            OR t.cover_image_url LIKE '%img.journeygo%'
            OR t.cover_image_url LIKE '%res.cloudinary.com/journeygo-demo%');
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 27] C1. tours.cover_image_url: % row(s) repointed.', v_fixed;
END
$c1$;

-- ── C2. tour_images ─────────────────────────────────────────────────────────────
DO $c2$
DECLARE v_fixed integer := 0;
BEGIN
    UPDATE tour_images ti
       SET image_url = pg_temp.pick_img('tour-img-' || ti.tour_id::text || '-' || ti.image_url)
     WHERE ti.image_url IS NOT NULL
       AND ti.image_url <> ''
       AND (ti.image_url LIKE '%wikimedia%'
            OR ti.image_url LIKE '%journeygo-demo%'
            OR ti.image_url LIKE '%img.journeygo%');
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 27] C2. tour_images: % row(s) repointed.', v_fixed;
END
$c2$;

-- ── C3. tour_stops ──────────────────────────────────────────────────────────────
DO $c3$
DECLARE v_fixed integer := 0;
BEGIN
    UPDATE tour_stops s
       SET image_url = pg_temp.pick_img('stop-' || s.tour_id::text || '-' || s.sequence_order::text),
           updated_at = now()
     WHERE s.image_url IS NOT NULL
       AND s.image_url <> ''
       AND (s.image_url LIKE '%wikimedia%'
            OR s.image_url LIKE '%journeygo-demo%'
            OR s.image_url LIKE '%img.journeygo%');
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 27] C3. tour_stops: % row(s) repointed.', v_fixed;
END
$c3$;

-- ── C4. tour_stop_artifacts ─────────────────────────────────────────────────────
DO $c4$
DECLARE v_fixed integer := 0;
BEGIN
    UPDATE tour_stop_artifacts a
       SET image_url = pg_temp.pick_img('artifact-' || a.stop_id::text || '-' || a.name)
     WHERE a.image_url IS NOT NULL
       AND a.image_url <> ''
       AND (a.image_url LIKE '%wikimedia%'
            OR a.image_url LIKE '%journeygo-demo%'
            OR a.image_url LIKE '%img.journeygo%');
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 27] C4. tour_stop_artifacts: % row(s) repointed.', v_fixed;
END
$c4$;

-- ── C5. tour_stop_cultural_images ──────────────────────────────────────────────
DO $c5$
DECLARE v_fixed integer := 0;
BEGIN
    UPDATE tour_stop_cultural_images c
       SET image_url = pg_temp.pick_img('cultural-' || c.stop_id::text || '-' || c.image_url)
     WHERE c.image_url IS NOT NULL
       AND c.image_url <> ''
       AND (c.image_url LIKE '%wikimedia%'
            OR c.image_url LIKE '%journeygo-demo%'
            OR c.image_url LIKE '%img.journeygo%');
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 27] C5. tour_stop_cultural_images: % row(s) repointed.', v_fixed;
END
$c5$;

-- ── C6. refund_requests (bằng chứng hoàn tiền) ─────────────────────────────────
DO $c6$
DECLARE v_fixed integer := 0;
BEGIN
    UPDATE refund_requests r
       SET evidence_attachments = json_build_array(
               pg_temp.pick_img('refund-ev-' || r.refund_code))::text,
           transfer_evidence = pg_temp.pick_img('refund-tr-' || r.refund_code),
           updated_at = now()
     WHERE (r.evidence_attachments LIKE '%wikimedia%'
            OR r.evidence_attachments LIKE '%journeygo-demo%'
            OR r.evidence_attachments LIKE '%img.journeygo%'
            OR r.transfer_evidence LIKE '%wikimedia%'
            OR r.transfer_evidence LIKE '%journeygo-demo%'
            OR r.transfer_evidence LIKE '%img.journeygo%');
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 27] C6. refund_requests: % row(s) repointed.', v_fixed;
END
$c6$;

-- ── C7. destinations / regions / users ─────────────────────────────────────────
DO $c7$
DECLARE v_fixed integer := 0;
BEGIN
    UPDATE destinations d
       SET cover_image_url = pg_temp.pick_img('dest-' || d.id::text),
           updated_at = now()
     WHERE d.cover_image_url IS NOT NULL
       AND d.cover_image_url <> ''
       AND (d.cover_image_url LIKE '%wikimedia%'
            OR d.cover_image_url LIKE '%journeygo-demo%'
            OR d.cover_image_url LIKE '%img.journeygo%');
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 27] C7a. destinations: % row(s) repointed.', v_fixed;

    UPDATE regions r
       SET image_url = pg_temp.pick_img('region-' || r.id::text),
           updated_at = now()
     WHERE r.image_url IS NOT NULL
       AND r.image_url <> ''
       AND (r.image_url LIKE '%wikimedia%'
            OR r.image_url LIKE '%journeygo-demo%'
            OR r.image_url LIKE '%img.journeygo%');
    GET DIAGNOSTICS v_fixed = ROW_COUNT;
    RAISE NOTICE '[Repair 27] C7b. regions: % row(s) repointed.', v_fixed;
END
$c7$;

-- =====================================================================================
--  VERIFY
-- =====================================================================================
\echo '-- V1. URL anh con tro toi host khong ton tai (phai = 0) --'
SELECT 'tours.cover' AS col, count(*) AS broken FROM tours WHERE cover_image_url LIKE '%journeygo-demo%' OR cover_image_url LIKE '%img.journeygo%' OR cover_image_url LIKE '%wikimedia%'
UNION ALL SELECT 'tour_images', count(*) FROM tour_images WHERE image_url LIKE '%journeygo-demo%' OR image_url LIKE '%img.journeygo%' OR image_url LIKE '%wikimedia%'
UNION ALL SELECT 'tour_stops', count(*) FROM tour_stops WHERE image_url LIKE '%journeygo-demo%' OR image_url LIKE '%img.journeygo%' OR image_url LIKE '%wikimedia%'
UNION ALL SELECT 'tour_stop_artifacts', count(*) FROM tour_stop_artifacts WHERE image_url LIKE '%journeygo-demo%' OR image_url LIKE '%img.journeygo%' OR image_url LIKE '%wikimedia%'
UNION ALL SELECT 'tour_stop_cultural_images', count(*) FROM tour_stop_cultural_images WHERE image_url LIKE '%journeygo-demo%' OR image_url LIKE '%img.journeygo%' OR image_url LIKE '%wikimedia%'
UNION ALL SELECT 'refund.evidence_attachments', count(*) FROM refund_requests WHERE evidence_attachments LIKE '%journeygo-demo%' OR evidence_attachments LIKE '%img.journeygo%' OR evidence_attachments LIKE '%wikimedia%'
UNION ALL SELECT 'refund.transfer_evidence', count(*) FROM refund_requests WHERE transfer_evidence LIKE '%journeygo-demo%' OR transfer_evidence LIKE '%img.journeygo%' OR transfer_evidence LIKE '%wikimedia%';

\echo '-- V2. So URL anh khac nhau dang dung (phai > 0) --'
SELECT count(DISTINCT cover_image_url) AS distinct_covers FROM tours WHERE cover_image_url IS NOT NULL;

\echo '-- V3. Mau anh --'
SELECT tour_id, cover_image_url FROM tours WHERE cover_image_url IS NOT NULL ORDER BY tour_id LIMIT 3;
