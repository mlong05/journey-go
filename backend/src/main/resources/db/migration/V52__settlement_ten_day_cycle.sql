-- =====================================================================================
--  V52 — Tất toán theo CHU KỲ 10 NGÀY (thay cho kỳ theo tháng).
--
--  ── Vì sao? ──
--  Yêu cầu: "tất toán 10 ngày 1 lần" để tiền về đối tác nhanh hơn (trước đây
--  chờ tới hết tháng). Chia mỗi tháng thành 3 kỳ:
--    • Kỳ 1 — ngày 01 → 10
--    • Kỳ 2 — ngày 11 → 20
--    • Kỳ 3 — ngày 21 → ngày cuối tháng (8/9/10/11 ngày tuỳ tháng)
--
--  ── Định dạng `revenue_period` ──
--  CŨ: "yyyy-MM"            (vd "2026-10")   → gom cả tháng vào 1 kỳ
--  MỚI: "yyyy-MM-D"         (vd "2026-10-1") → D = số thứ tự kỳ (1|2|3)
--
--  Giữ dạng chuỗi "yyyy-MM-D" (thay vì dùng cột ngày riêng) vì:
--    • vẫn so sánh/sắp xếp được bằng chuỗi như cũ ⇒ các truy vấn gom nhóm
--      theo kỳ (GROUP BY revenue_period) KHÔNG phải sửa;
--    • 1 kỳ = 1 chuỗi ⇒ ràng buộc unique "mỗi kỳ 1 đợt" giữ nguyên;
--    • quy đổi kỳ tháng cũ → kỳ 10 ngày là 1 câu UPDATE đơn giản.
--
--  ── Quy đổi dữ liệu cũ ──
--  Khoản doanh thu có `completed_date` (ngày hoàn thành trải nghiệm) ⇒ xác định
--  được chu kỳ chính xác. Quy đổi theo `completed_date`:
--    ngày 01-10         → kỳ 1
--    ngày 11-20         → kỳ 2
--    ngày 21-cuối tháng → kỳ 3
--  Khoản KHÔNG có `completed_date` (dữ liệu cũ) ⇒ coi như kỳ 3 (cuối tháng),
--  vì kỳ cũ theo THÁNG cũng là kỳ cuối cùng của tháng ⇒ giữ nguyên ý nghĩa.
--
--  ⚠️ Đợt tất toán (settlements) đã có sẽ được quy đổi theo `period_start` —
--  dùng NGÀY BẮT ĐẦU của đợt để xác định chu kỳ.
--
--  Migration idempotent: chỉ quy đổi dòng có định dạng CŨ ("yyyy-MM", 7 ký tự).
-- =====================================================================================

-- ── 1. Nới độ dài cột ────────────────────────────────────────────────────────────
-- `revenue_period` cũ chỉ chứa 7 ký tự ("2026-10"); định dạng mới cần 10 ("2026-10-1").
--
-- ⚠️ THỨ TỰ BẮT BUỘC: cột `batch_period_key` là GENERATED (STORED) theo `revenue_period`
-- ⇒ PostgreSQL KHÔNG cho phép đổi kiểu dữ liệu của cột mà cột GENERATED đang dùng
--    ("cannot alter type of a column used by a generated column").
-- ⇒ Phải: (1) xoá cột GENERATED + index của nó, (2) đổi kiểu `revenue_period`,
--          (3) tạo lại cột GENERATED với độ dài mới.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'settlements' AND column_name = 'batch_period_key'
    ) THEN
        DROP INDEX IF EXISTS uk_settlement_batch_period;
        ALTER TABLE settlements DROP COLUMN batch_period_key;
    END IF;
END $$;

ALTER TABLE provider_revenues   ALTER COLUMN revenue_period TYPE VARCHAR(10);
ALTER TABLE settlements        ALTER COLUMN revenue_period TYPE VARCHAR(10);
ALTER TABLE settlement_details ALTER COLUMN revenue_period TYPE VARCHAR(10);

-- Tạo lại cột GENERATED với độ dài mới (giữ ràng buộc "mỗi kỳ chỉ 1 đợt tổng").
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'settlements' AND column_name = 'batch_period_key'
    ) THEN
        ALTER TABLE settlements
            ADD COLUMN batch_period_key VARCHAR(10)
                GENERATED ALWAYS AS (
                    CASE WHEN scope = 'BATCH' THEN revenue_period ELSE NULL END
                ) STORED;
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                   WHERE schemaname = current_schema() AND indexname = 'uk_settlement_batch_period') THEN
        CREATE UNIQUE INDEX uk_settlement_batch_period
            ON settlements (batch_period_key);
    END IF;
END $$;

-- ── 2. Quy đổi `provider_revenues` theo `completed_date` ─────────────────────────
UPDATE provider_revenues
SET revenue_period = to_char(completed_date, 'YYYY-MM')
                    || '-'
                    || CASE
                         WHEN EXTRACT(DAY FROM completed_date) <= 10 THEN '1'
                         WHEN EXTRACT(DAY FROM completed_date) <= 20 THEN '2'
                         ELSE '3'
                       END
WHERE completed_date IS NOT NULL
  AND revenue_period ~ '^\d{4}-\d{2}$';

-- Không có `completed_date` ⇒ kỳ 3 (cuối tháng) cho khớp ý nghĩa kỳ cũ theo tháng.
UPDATE provider_revenues
SET revenue_period = revenue_period || '-3'
WHERE revenue_period ~ '^\d{4}-\d{2}$';

-- ── 3. Quy đổi `settlement_details` theo `provider_revenues` (kỳ gốc) ─────────────
UPDATE settlement_details d
SET revenue_period = r.revenue_period
FROM provider_revenues r
WHERE r.id = d.provider_revenue_id
  AND d.revenue_period ~ '^\d{4}-\d{2}$';

-- Phần còn lại (không khớp doanh thu) ⇒ kỳ 3.
UPDATE settlement_details
SET revenue_period = revenue_period || '-3'
WHERE revenue_period ~ '^\d{4}-\d{2}$';

-- ── 4. Quy đổi `settlements` theo `period_start` ─────────────────────────────────
-- Đợt đã tạo theo kỳ THÁNG (period_start = ngày 1) ⇒ gom về kỳ 1.
-- Đợt đã tạo theo kỳ 10 ngày ⇒ period_start = ngày 1/11/21 ⇒ kỳ 1/2/3.
UPDATE settlements
SET revenue_period = to_char(period_start, 'YYYY-MM')
                    || '-'
                    || CASE
                         WHEN EXTRACT(DAY FROM period_start) <= 10 THEN '1'
                         WHEN EXTRACT(DAY FROM period_start) <= 20 THEN '2'
                         ELSE '3'
                       END
WHERE revenue_period ~ '^\d{4}-\d{2}$';

-- Chuẩn hoá lại `period_start` / `period_end` cho đợt (theo chu kỳ mới).
UPDATE settlements s
SET period_start = (r.period_start),
    period_end   = (r.period_end)
FROM (
    SELECT revenue_period,
           MIN(to_date(substring(revenue_period from 1 for 7) || '-' ||
                       CASE substring(revenue_period from 9 for 1)
                           WHEN '1' THEN '01'
                           WHEN '2' THEN '11'
                           ELSE '21'
                       END, 'YYYY-MM-DD')) AS period_start,
           MAX(to_date(substring(revenue_period from 1 for 7) || '-' ||
                       CASE substring(revenue_period from 9 for 1)
                           WHEN '1' THEN '10'
                           WHEN '2' THEN '20'
                           ELSE NULL
                       END, 'YYYY-MM-DD')) AS period_end
    FROM settlements
    WHERE revenue_period ~ '^\d{4}-\d{2}-\d$'
    GROUP BY revenue_period
) r
WHERE s.revenue_period = r.revenue_period
  AND r.period_end IS NOT NULL;

-- Kỳ 3 ⇒ period_end = ngày cuối tháng.
UPDATE settlements s
SET period_end = (date_trunc('month', s.period_start) + interval '1 month - 1 day')::date
WHERE s.revenue_period ~ '^\d{4}-\d{2}-3$'
  AND s.period_end <> (date_trunc('month', s.period_start) + interval '1 month - 1 day')::date;

-- ── 5. Kiểm tra ──────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_bad INT;
BEGIN
    SELECT count(*) INTO v_bad
    FROM provider_revenues
    WHERE revenue_period !~ '^\d{4}-\d{2}-\d$';
    IF v_bad > 0 THEN
        RAISE WARNING 'V52: còn % khoản doanh thu có revenue_period chưa đúng định dạng mới.', v_bad;
    END IF;

    SELECT count(*) INTO v_bad
    FROM settlements
    WHERE revenue_period !~ '^\d{4}-\d{2}-\d$';
    IF v_bad > 0 THEN
        RAISE WARNING 'V52: còn % đợt tất toán có revenue_period chưa đúng định dạng mới.', v_bad;
    END IF;
END $$;
