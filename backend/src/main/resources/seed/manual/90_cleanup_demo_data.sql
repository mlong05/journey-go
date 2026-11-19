-- =====================================================================================
--  SEED 90 — DỌN DỮ LIỆU DEMO (revert) — CHẠY THỦ CÔNG KHI CẦN
-- =====================================================================================
--  Mục đích
--    Gỡ bỏ dữ liệu demo đã seed để bắt đầu lại từ đầu, hoặc chỉ gỡ riêng phần
--    tất toán 2026 để test lại luồng "tạo đợt tất toán" từ đầu.
--
--  Có 2 chế độ (comment/uncomment để chọn):
--    A. XOÁ TOÀN BỘ dữ liệu demo (tài khoản, tour, giao dịch) — dùng khi muốn
--       dựng lại từ đầu.
--    B. CHỈ gỡ phần tất toán 2026 + giải phóng các đợt tất toán đã tạo — dùng khi
--       muốn test lại thao tác tạo & duyệt đợt tất toán mà không mất dữ liệu khác.
--
--  ⚠️ CHẠY THỦ CÔNG — KHÔNG tự chạy khi Backend khởi động.
--     Luôn BACKUP database trước khi chạy.
--
--  Cách chạy:
--     psql -h localhost -U postgres -d journeygo_db -f 90_cleanup_demo_data.sql
-- =====================================================================================

\set ON_ERROR_STOP on

BEGIN;

-- ═══════════════════════════════════════════════════════════════════════════════
--  CHẾ ĐỘ A — XOÁ TOÀN BỘ DỮ LIỆU DEMO
--  (bỏ comment khối dưới đây nếu muốn dùng)
-- ═══════════════════════════════════════════════════════════════════════════════
-- -- 1. Gỡ đợt tất toán (xoá trước vì provider_revenues tham chiếu settlement_id)
-- DELETE FROM settlements;
-- DELETE FROM settlement_details;
--
-- -- 2. Gỡ khoản doanh thu đối tác
-- DELETE FROM provider_revenues;
--
-- -- 3. Gỡ điều chỉnh tài chính
-- DELETE FROM financial_adjustments;
--
-- -- 4. Gỡ hoàn tiền + nhật ký hoàn tiền
-- DELETE FROM refund_audit_logs;
-- DELETE FROM refund_requests;
--
-- -- 5. Gỡ thanh toán
-- DELETE FROM payments;
--
-- -- 6. Gỡ booking (hành khách, giữ chỗ slot, lịch sử trạng thái)
-- DELETE FROM booking_passenger_changes;
-- DELETE FROM booking_passenger_invitations;
-- DELETE FROM booking_slot_holds;
-- DELETE FROM booking_passengers;
-- DELETE FROM bookings;
--
-- -- 7. Gỡ voucher đã dùng + voucher của đối tác
-- DELETE FROM user_vouchers;
-- DELETE FROM vouchers WHERE voucher_scope = 'PARTNER' OR code LIKE 'JG-VOUCHER-%';
--
-- -- 8. Gỡ tour demo (giữ lại bảng tours nhưng xoá nội dung sinh bởi seeder)
-- DELETE FROM tour_stop_answers;
-- DELETE FROM tour_stop_questions;
-- DELETE FROM tour_stop_experiences;
-- DELETE FROM tour_stop_artifacts;
-- DELETE FROM tour_stop_cultural_images;
-- DELETE FROM tour_stops;
-- DELETE FROM tour_reviews;
-- DELETE FROM tour_review_history;
-- DELETE FROM tour_slots;
-- DELETE FROM tour_departure_dates;
-- DELETE FROM tour_prices;
-- DELETE FROM tour_images;
-- DELETE FROM tour_highlights;
-- DELETE FROM tour_itinerary_days;
-- DELETE FROM tours;
--
-- -- 9. Gỡ ví + hồ sơ đối tác + tài khoản demo
-- DELETE FROM wallet_transactions;
-- DELETE FROM wallets;
-- DELETE FROM provider_profiles WHERE user_id IN (
--     SELECT id FROM users WHERE email LIKE '%@journeygo.com'
-- );
-- DELETE FROM user_points WHERE user_id IN (
--     SELECT id FROM users WHERE email LIKE '%@journeygo.com'
-- );
-- DELETE FROM users WHERE email LIKE '%@journeygo.com';

-- ═══════════════════════════════════════════════════════════════════════════════
--  CHẾ ĐỘ B — CHỈ GỠ PHẦN TẤT TOÁN 2026 + GIẢI PHÓNG ĐỢT ĐÃ TẠO
--  (khối này LUÔN chạy — dùng để test lại luồng tạo đợt tất toán)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Giải phóng các khoản doanh thu đang bị gắn vào đợt tất toán
--    (đưa về ELIGIBLE, settlement_id = NULL) — kể cả đợt đã DUYỆT (đã cộng tiền ví).
UPDATE provider_revenues
SET settlement_id = NULL,
    status        = 'ELIGIBLE',
    settled_at    = NULL,
    updated_at    = NOW()
WHERE settlement_id IS NOT NULL;

-- 2. Gỡ chi tiết các khoản trong đợt tất toán
DELETE FROM settlement_details;

-- 3. Gỡ các đợt tất toán
DELETE FROM settlements;

-- 4. Gỡ giao dịch 2026 (mã booking tiền tố JGB26)
DELETE FROM refund_audit_logs
WHERE refund_request_id IN (
    SELECT r.id FROM refund_requests r
    JOIN payments p ON p.id = r.payment_id
    JOIN bookings b ON b.id = p.booking_id
    WHERE b.booking_code LIKE 'JGB26%'
);

DELETE FROM refund_requests
WHERE payment_id IN (
    SELECT p.id FROM payments p
    JOIN bookings b ON b.id = p.booking_id
    WHERE b.booking_code LIKE 'JGB26%'
);

DELETE FROM provider_revenues
WHERE booking_id IN (SELECT id FROM bookings WHERE booking_code LIKE 'JGB26%');

DELETE FROM payments
WHERE booking_id IN (SELECT id FROM bookings WHERE booking_code LIKE 'JGB26%');

DELETE FROM user_vouchers
WHERE used_order_reference LIKE 'JGB26%';

DELETE FROM booking_slot_holds
WHERE booking_id IN (SELECT id FROM bookings WHERE booking_code LIKE 'JGB26%');

DELETE FROM booking_passengers
WHERE booking_id IN (SELECT id FROM bookings WHERE booking_code LIKE 'JGB26%');

DELETE FROM bookings WHERE booking_code LIKE 'JGB26%';

COMMIT;

\echo '=== Kiểm tra sau khi dọn ==='
SELECT count(*) AS so_booking_jgb26 FROM bookings WHERE booking_code LIKE 'JGB26%';
SELECT count(*) AS so_dot_tat_toan    FROM settlements;
SELECT status, count(*) FROM provider_revenues GROUP BY status ORDER BY status;
