-- Kiểm tra tính hợp lệ của dữ liệu seed (chạy sau khi nạp seed_published_tours.sql)

\echo '=== 1. Cau quiz: phai co dung 4 dap an va 1 dap an dung ==='
SELECT q.id, q.stop_id, count(a.id) AS n_answers,
       count(*) FILTER (WHERE a.is_correct) AS n_correct
FROM tour_stop_questions q
LEFT JOIN tour_stop_answers a ON a.question_id = q.id
WHERE q.kind = 'QUIZ'
  AND q.stop_id IN (SELECT id FROM tour_stops WHERE tour_id BETWEEN 30 AND 49)
GROUP BY q.id, q.stop_id
HAVING count(a.id) <> 4 OR count(*) FILTER (WHERE a.is_correct) <> 1;

\echo '=== 2. Tour vi pham rang buoc TourSubmissionValidator ==='
SELECT tour_id, title,
       (highlights < 3 OR highlights > 5) AS bad_highlights,
       images < 5                          AS bad_images,
       cover_image_url IS NULL            AS bad_cover,
       (max_guests_per_slot IS NULL OR max_guests_per_slot <= 0) AS bad_capacity,
       cancellation_policy IS NULL         AS bad_cancel,
       (content_rights_confirmed = FALSE) AS bad_rights,
       (region_id IS NULL OR theme_id IS NULL) AS bad_refs,
       description IS NULL                 AS bad_desc,
       (SELECT count(*) FROM tour_departure_dates d
         WHERE d.tour_id = t.tour_id AND d.departure_date > CURRENT_DATE) AS future_departures
FROM (
    SELECT t.tour_id, t.title, t.cover_image_url, t.max_guests_per_slot, t.cancellation_policy,
           t.content_rights_confirmed, t.region_id, t.theme_id, t.description,
           (SELECT count(*) FROM tour_highlights h WHERE h.tour_id = t.tour_id) AS highlights,
           (SELECT count(*) FROM tour_images i     WHERE i.tour_id = t.tour_id) AS images
    FROM tours t
    WHERE t.tour_id BETWEEN 30 AND 49
) t
WHERE highlights < 3 OR highlights > 5 OR images < 5 OR cover_image_url IS NULL
   OR max_guests_per_slot IS NULL OR max_guests_per_slot <= 0 OR cancellation_policy IS NULL
   OR content_rights_confirmed = FALSE OR region_id IS NULL OR theme_id IS NULL OR description IS NULL
   OR (SELECT count(*) FROM tour_departure_dates d
         WHERE d.tour_id = t.tour_id AND d.departure_date > CURRENT_DATE) = 0;

\echo '=== 3. Moi tour phai co dung 4 dong gia, em be gia 0 ==='
SELECT tour_id, count(*) AS n_prices,
       count(*) FILTER (WHERE guest_type = 'INFANT' AND price <> 0) AS bad_infant
FROM tour_prices
WHERE tour_id BETWEEN 30 AND 49
GROUP BY tour_id
HAVING count(*) <> 4 OR count(*) FILTER (WHERE guest_type = 'INFANT' AND price <> 0) > 0;

\echo '=== 4. Moi tour: 3 diem den, moi diem den 1 trai nghiem + 2 quiz + 1 cau sau trai nghiem ==='
SELECT t.tour_id, t.title,
       (SELECT count(*) FROM tour_stops s WHERE s.tour_id = t.tour_id) AS stops,
       (SELECT count(*) FROM tour_stop_experiences e
          JOIN tour_stops s ON s.id = e.stop_id WHERE s.tour_id = t.tour_id) AS experiences,
       (SELECT count(*) FROM tour_stop_questions q
          JOIN tour_stops s ON s.id = q.stop_id
         WHERE s.tour_id = t.tour_id AND q.kind = 'QUIZ') AS quiz,
       (SELECT count(*) FROM tour_stop_questions q
          JOIN tour_stop_experiences e ON e.id = q.experience_id
          JOIN tour_stops s ON s.id = e.stop_id
         WHERE s.tour_id = t.tour_id AND q.kind = 'POST_EXPERIENCE') AS post_exp,
       (SELECT count(*) FROM tour_slots sl WHERE sl.tour_id = t.tour_id) AS slots,
       (SELECT count(*) FROM tour_departure_dates d WHERE d.tour_id = t.tour_id) AS departures
FROM tours t
WHERE t.tour_id BETWEEN 30 AND 49
ORDER BY t.tour_id;

\echo '=== 5. Slot phai khop ngay khoi hanh, deu OPEN, chua ai dat ==='
SELECT tour_id,
       count(*) FILTER (WHERE status <> 'OPEN') AS not_open,
       count(*) FILTER (WHERE booked_count <> 0) AS has_booking,
       count(*) FILTER (WHERE capacity <> max_guests_per_slot) AS bad_capacity
FROM tour_slots
WHERE tour_id BETWEEN 30 AND 49
GROUP BY tour_id
HAVING count(*) FILTER (WHERE status <> 'OPEN') > 0
    OR count(*) FILTER (WHERE booked_count <> 0) > 0
    OR count(*) FILTER (WHERE capacity <> max_guests_per_slot) > 0;

\echo '=== 6. Review phai APPROVED + lich su SUBMITTED/APPROVED ==='
SELECT r.tour_id, r.status, r.tour_version, r.reviewer_id,
       count(h.id) FILTER (WHERE h.action = 'SUBMITTED') AS n_submitted,
       count(h.id) FILTER (WHERE h.action = 'APPROVED')  AS n_approved
FROM tour_reviews r
LEFT JOIN tour_review_history h ON h.review_id = r.id
WHERE r.tour_id BETWEEN 30 AND 49
GROUP BY r.tour_id, r.status, r.tour_version, r.reviewer_id
ORDER BY r.tour_id;

\echo '=== 7. KHONG duoc co booking / payment cho cac tour seed ==='
SELECT (SELECT count(*) FROM bookings WHERE tour_id BETWEEN 30 AND 49) AS seed_bookings,
       (SELECT count(*) FROM payments)                             AS total_payments,
       (SELECT count(*) FROM refund_requests)                     AS total_refunds;

\echo '=== 8. Diem thuong da chot (QUIZ=10, REAL_WORLD_EXPERIENCE=50) ==='
SELECT 'QUIZ' AS kind, count(*) AS n, min(points_reward) AS min_pts, max(points_reward) AS max_pts
FROM tour_stop_questions
WHERE kind = 'QUIZ' AND stop_id IN (SELECT id FROM tour_stops WHERE tour_id BETWEEN 30 AND 49)
UNION ALL
SELECT 'EXPERIENCE', count(*), min(points_reward), max(points_reward)
FROM tour_stop_experiences
WHERE stop_id IN (SELECT id FROM tour_stops WHERE tour_id BETWEEN 30 AND 49);

\echo '=== 9. QR token trai nghiem phai dung dinh dang JGE- + 16 hex ==='
SELECT count(*) AS bad_qr
FROM tour_stop_experiences
WHERE stop_id IN (SELECT id FROM tour_stops WHERE tour_id BETWEEN 30 AND 49)
  AND qr_token !~ '^JGE-[0-9A-F]{16}$';
