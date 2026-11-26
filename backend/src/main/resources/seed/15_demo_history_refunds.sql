-- =====================================================================================
--  SEED 15 — YÊU CẦU HOÀN TIỀN LỊCH SỬ 2024–2026 (JourneyGo History Demo)
-- =====================================================================================
--  Mục đích
--    Tạo ~600 yêu cầu hoàn tiền trên các booking demo JGH24/JGH25/JGH26, đúng trạng
--    thái "Tourist đã gửi, chờ Admin duyệt" (PENDING_REVIEW) với mốc thời gian
--    LỊCH SỬ (created_at / reviewed_at đều nằm trong quá khứ).
--
--  ⚠️ TUYỆT ĐỐI KHÔNG
--    * KHÔNG tự đặt trạng thái REFUNDED — việc duyệt & hoàn tiền sẽ chạy qua API
--      thật của Admin (script 17_demo_api_refunds.mjs) ⇒ sinh audit log + sự kiện
--      RefundCompletedEvent ⇒ ProviderRevenue tự tính lại ⇒ khớp 100% với
--      công thức tài chính.
--    * KHÔNG INSERT settlement ở trạng thái PAID/COMPLETED.
--    * Không DELETE / TRUNCATE bất kỳ bảng nào.
--
--  Vì sao seed PENDING_REVIEW mà không seed REFUNDED?
--    Vì nghiệp vụ bắt buộc:
--      · Admin phải duyệt (chọn nhóm lý do) → hệ thống TỰ TÍNH số tiền theo chính
--        sách (PERSONAL: 80%/50%/0% theo thời điểm gửi; PLATFORM/PROVIDER: 100%;
--        FORCE_MAJEURE: 0%).
--      · Chỉ khi có bằng chứng xác minh (mã tham chiếu + bằng chứng) mới sang
--        REFUNDED ⇒ RefundCompletedEvent ⇒ cập nhật provider_revenues.
--    ⇒ Nếu seed thẳng REFUNDED thì số tiền hoàn sẽ KHÔNG khớp với công thức
--      ⇒ đợt tất toán bị từ chối với SETTLEMENT_ELIGIBILITY_CHANGED.
--
--  IDEMPOTENT: mã refund `JGRF24…` / `JGRF25…` / `JGRF26…`.
-- =====================================================================================

\set ON_ERROR_STOP on

DO $guard$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@journeygo.com') THEN
        RAISE EXCEPTION 'Không tìm thấy admin@journeygo.com — dừng lại để an toàn.';
    END IF;
END
$guard$;

DO $seed$
DECLARE
    c_target_total   int := 600;
    c_rate           numeric := 0.2000;
    c_seed_tag       text := 'JGHD2024_2026';

    -- Danh sách booking ứng viên: booking demo đã thanh toán thành công, CHƯA có refund.
    -- Mỗi booking được chọn theo thứ tự ngẫu nhiên ổn định (md5) để phân bổ đều.
    v_candidates     record;
    v_pick           record;

    v_admin_id       bigint;
    v_total          int;
    v_per_year       int;
    v_created        int := 0;
    v_seq            int := 0;
    v_year           int;
    v_prefix         text;
    v_refund_code    varchar(32);

    v_booking        record;
    v_payment_id     bigint;
    v_tourist_id     bigint;
    v_amount         numeric(14,2);
    v_exp_date       date;
    v_created_at     timestamptz;
    v_reason         text;
    v_reason_code    text;
    v_reason_summary text;
    v_reason_detail  text;
    v_evidence       text;
    v_attachments    text;
    v_bank_no        text;
    v_bank_name      text;
    v_bank_name_en   text;
    v_tier           text;
    v_proposed       numeric(14,2);
BEGIN
    SELECT count(*) INTO v_total
    FROM refund_requests WHERE refund_code LIKE 'JGRF2%';
    IF v_total > 0 THEN
        RAISE NOTICE '[Seed 15] Đã có % yêu cầu hoàn tiền JGRF2x — bỏ qua.', v_total;
        RETURN;
    END IF;

    SELECT id INTO v_admin_id FROM users WHERE email = 'admin@journeygo.com';
    IF v_admin_id IS NULL THEN
        RAISE EXCEPTION 'Không tìm thấy admin@journeygo.com.';
    END IF;

    -- Số yêu cầu cho từng năm: 2024 → 220, 2025 → 250, 2026 → 130.
    FOR v_year IN 2024..2026 LOOP
        v_per_year := CASE v_year WHEN 2024 THEN 220 WHEN 2025 THEN 250 ELSE 130 END;
        v_prefix := 'JGRF' || substr(v_year::text, 3);

        -- Ứng viên: booking demo của NĂM này, payment SUCCESS, chưa có refund nào.
        FOR v_pick IN
            SELECT b.id            AS booking_id,
                   b.tourist_id    AS tourist_id,
                   b.experience_date AS experience_date,
                   p.id            AS payment_id,
                   p.amount        AS amount,
                   row_number() OVER (ORDER BY md5(b.booking_code)) AS rn
            FROM bookings b
            JOIN payments p ON p.booking_id = b.id
            WHERE b.booking_code LIKE 'JGH' || substr(v_year::text, 3) || '%'
              AND b.status = 'COMPLETED'
              AND p.status = 'SUCCESS'
              AND NOT EXISTS (SELECT 1 FROM refund_requests r WHERE r.payment_id = p.id)
              AND b.experience_date < DATE '2026-11-26'
            ORDER BY md5(b.booking_code)
        LOOP
            EXIT WHEN v_pick.rn > v_per_year;
            EXIT WHEN v_created >= c_target_total;

            v_seq := v_seq + 1;

            -- ── Phân bổ ngẫu nhiên (ổn định) ────────────────────────────────
            -- tier: 60% EARLY (≥7 ngày), 30% MID (72h–6 ngày), 10% LATE (<72h)
            -- nhóm lý do: 70% PERSONAL, 12% PLATFORM_FAULT, 10% PROVIDER_FAULT,
            --              8% FORCE_MAJEURE
            v_tier := CASE
                WHEN (v_seq % 10) IN (0, 1) THEN 'LATE'
                WHEN (v_seq % 10) IN (2, 3, 4, 5) THEN 'MID'
                ELSE 'EARLY'
            END;

            -- Thời điểm khách gửi yêu cầu (mốc quyết định tỷ lệ hoàn).
            v_exp_date := v_pick.experience_date;
            v_created_at := CASE v_tier
                WHEN 'EARLY' THEN ((v_exp_date - (9 + (v_seq % 12)))::timestamptz
                                    AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '11 hours'
                WHEN 'MID'   THEN ((v_exp_date - (4 + (v_seq % 3)))::timestamptz
                                    AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '14 hours'
                ELSE             ((v_exp_date - (v_seq % 2))::timestamptz
                                    AT TIME ZONE 'Asia/Ho_Chi_Minh') + interval '18 hours'
            END;

            -- Số tiền ĐỀ XUẤT — hệ thống sẽ tính lại khi Admin duyệt:
            --   · Tourist KHÔNG chọn nhóm lý do ⇒ đề xuất = 0 (Admin phân loại).
            --   · Ở đây ta đặt đề xuất = 0 cho nhóm cá nhân (khách chỉ mô tả bằng
            --     văn bản) và theo chính sách cho nhóm còn lại — để dữ liệu phản ánh
            --     đúng hành vi thật của hệ thống hiện tại.
            v_reason_summary := NULL;

            CASE
                WHEN (v_seq % 25) = 0 THEN
                    v_reason := 'PLATFORM_FAULT';
                    v_reason_code := 'SYSTEM_OUTAGE';
                    v_reason_summary := 'Hệ thống ghi nhận check-in bị gián đoạn';
                    v_reason_detail := 'Khách báo hệ thống không ghi nhận được lượt check-in tại điểm đến trong suốt buổi trải nghiệm. Đề nghị đối tác và nền tảng kiểm tra lại nhật ký GPS.';
                    v_proposed := round(v_pick.amount * 1.0000, 2);
                WHEN (v_seq % 25) = 11 THEN
                    v_reason := 'PROVIDER_FAULT';
                    v_reason_code := 'PROVIDER_CANCELLED_TOUR';
                    v_reason_summary := 'Đối tác hủy tour giữa chừng';
                    v_reason_detail := 'Đối tác thông báo hủy chuyến do hướng dẫn viên bị sự cố, khách không được thực hiện trải nghiệm như đã cam kết.';
                    v_proposed := round(v_pick.amount * 1.0000, 2);
                WHEN (v_seq % 25) = 17 THEN
                    v_reason := 'FORCE_MAJEURE';
                    v_reason_code := 'NATURAL_DISASTER';
                    v_reason_summary := 'Bão lớn ảnh hưởng điểm đến';
                    v_reason_detail := 'Thời tiết xấu do bão mạnh buộc phải hủy hành trình. Khách đề nghị xem xét hoàn tiền.';
                    v_proposed := round(v_pick.amount * 0.0000, 2);
                ELSE
                    v_reason := 'PERSONAL';
                    v_reason_code := CASE (v_seq % 6)
                        WHEN 0 THEN 'HEALTH_ISSUE'
                        WHEN 1 THEN 'WORK_EMERGENCY'
                        WHEN 2 THEN 'FAMILY_EMERGENCY'
                        WHEN 3 THEN 'PERSONAL_PLAN_CHANGE'
                        WHEN 4 THEN 'TRANSPORT_ISSUE'
                        ELSE 'PERSONAL_ACCIDENT'
                    END;
                    v_reason_summary := CASE v_reason_code
                        WHEN 'HEALTH_ISSUE'       THEN 'Bị sốt nặng, không thể đi'
                        WHEN 'WORK_EMERGENCY'      THEN 'Công việc đột xuất'
                        WHEN 'FAMILY_EMERGENCY'    THEN 'Có việc gia đình gấp'
                        WHEN 'PERSONAL_PLAN_CHANGE' THEN 'Thay đổi kế hoạch cá nhân'
                        WHEN 'TRANSPORT_ISSUE'     THEN 'Không thể di chuyển tới địa điểm'
                        ELSE 'Tai nạn cá nhân nhẹ'
                    END;
                    v_reason_detail := 'Khách thông báo không thể tham dự chuyến đi đã đăng ký. Khách gửi kèm ảnh chụp biên lai thanh toán để đối chiếu.';
                    -- Nhóm cá nhân: Tourist KHÔNG tự nhập số tiền ⇒ đề xuất = 0.
                    v_proposed := 0;
            END CASE;

            v_bank_no      := '0' || lpad((10000000 + (v_seq * 137) % 89999999)::text, 8, '0');
            v_bank_name    := 'Nguyễn ' || substr(v_pick.tourist_id::text, 1, 1) || ' Vân';
            v_bank_name_en := 'MB Bank';

            v_refund_code := v_prefix || lpad(v_seq::text, 6, '0');

            -- Bằng chứng: ảnh biên lai thanh toán (bắt buộc theo luồng Tourist).
            v_attachments := '["https://res.cloudinary.com/journeygo-demo/image/upload/demo/receipts/'
                            || v_refund_code || '.jpg"]';
            v_evidence := 'Ảnh biên lai thanh toán từ ứng dụng ngân hàng.';

            -- ══ INSERT REFUND REQUEST (PENDING_REVIEW) ═════════════════════
            INSERT INTO refund_requests (refund_code, payment_id, tourist_id, status,
                                        declared_reason, declared_reason_code,
                                        reason_summary, reason_detail,
                                        evidence, evidence_attachments,
                                        proposed_amount, currency,
                                        bank_account_number, bank_account_name, bank_name,
                                        created_at, updated_at)
            VALUES (v_refund_code, v_pick.payment_id, v_pick.tourist_id, 'PENDING_REVIEW',
                    v_reason, v_reason_code,
                    v_reason_summary, v_reason_detail,
                    v_evidence, v_attachments,
                    v_proposed, 'VND',
                    v_bank_no, v_bank_name, v_bank_name_en,
                    v_created_at, v_created_at);

            v_created := v_created + 1;
        END LOOP;

        RAISE NOTICE '[Seed 15] Năm %: đã tạo % yêu cầu hoàn tiền.', v_year, v_created;
    END LOOP;

    RAISE NOTICE '[Seed 15] ✔ Tổng cộng % yêu cầu hoàn tiền PENDING_REVIEW.', v_created;
END
$seed$;

-- ═══════════════════════════════════════════════════════════════════════════
--  CHECKPOINT
-- ═══════════════════════════════════════════════════════════════════════════
INSERT INTO demo_seed_checkpoints (script_name, batch_tag, record_count, note)
SELECT '15_demo_history_refunds', 'JGHD2024_2026',
       (SELECT count(*) FROM refund_requests WHERE refund_code LIKE 'JGRF2%'),
       'Yêu cầu hoàn tiền PENDING_REVIEW — chờ Admin duyệt qua API (script 17).'
ON CONFLICT (script_name) DO UPDATE
    SET record_count = EXCLUDED.record_count,
        executed_at  = now(),
        note         = EXCLUDED.note;

\echo '=== Phân bổ yêu cầu hoàn tiền theo năm & nhóm lý do ==='
SELECT substr(refund_code, 1, 5) AS nam,
       declared_reason,
       status,
       count(*)             AS so_yeu_cau,
       sum(proposed_amount) AS tong_de_xuat
FROM refund_requests
WHERE refund_code LIKE 'JGRF2%'
GROUP BY 1, 2, 3
ORDER BY 1, 2;

\echo '=== Kiểm tra mỗi payment chỉ có tối đa 1 yêu cầu ==='
SELECT count(*) AS payment_co_nhieu_yeu_cau
FROM (
    SELECT payment_id FROM refund_requests
    WHERE refund_code LIKE 'JGRF2%'
    GROUP BY payment_id HAVING count(*) > 1
) t;
