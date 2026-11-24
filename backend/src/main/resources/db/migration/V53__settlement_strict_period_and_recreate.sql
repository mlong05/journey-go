-- =====================================================================================
--  V53 — ĐỢT TẤT TOÁN: CÔ LẬP THEO KỲ + CHO PHÉP TẠO LẠI SAU KHI TỪ CHỐI
-- =====================================================================================
--  ── Vì sao? ──
--  Yêu cầu: "Một đợt tất toán chỉ bao gồm những giao dịch đủ điều kiện mà thôi —
--  ví dụ đợt 01/10/2026 → 10/10/2026 thì chỉ lấy giao dịch trong khoảng thời gian
--  đó" và "khi bấm từ chối thì admin phải tự qua Tạo đợt tất toán, chọn lại kỳ
--  doanh thu rồi bấm tạo đợt tất toán thủ công".
--
--  ⇒ 2 vấn đề cần sửa ở tầng DB:
--
--  (1) Đợt TỔNG bị gom "doanh thu chuyển tiếp" — tức khoản của kỳ TRƯỚC. Đợt
--      "Kỳ 2 (11–20/11/2026)" vì thế chứa dữ liệu của cả tháng và các tháng trước.
--      Logic gom đã được sửa ở tầng service (BatchSettlementService#collectCandidates
--      và SettlementService#getCandidates) — nay chỉ lấy khoản thuộc ĐÚNG kỳ.
--      Migration này dọn lại các đợt DRAFT đã bị gom sai trước đó.
--
--  (2) Unique index `uk_settlement_batch_period` (trên cột GENERATED
--      `batch_period_key` = revenue_period khi scope='BATCH') chặn tạo đợt TỔNG
--      thứ hai cho cùng một kỳ — KỂ CẢ khi đợt cũ đã bị TỪ CHỐI. ⇒ Admin từ
--      chối đợt rồi muốn tạo lại thủ công thì bị lỗi "duplicate key".
--      ⇒ Đổi thành unique index CHỈ trên các đợt "còn sống" (DRAFT / APPROVED).
--      Đợt REJECTED / CANCELLED không còn chiếm chỗ ⇒ tạo lại được.
--
--  ⚠️ Cùng nguyên nhắc với `uk_settlement_provider_profile_period` (đợt của MỘT
--  đối tác) — cùng bị lỗi trên ⇒ cũng đổi thành partial unique index.
-- =====================================================================================

-- ── 1. DỌN CÁC ĐỢT DRAFT BỊ GOM SAI ────────────────────────────────────────────
--
--  1a. Giải phóng khoản doanh thu bị gom NHẦM vào đợt DRAFT (khoản của kỳ khác)
--      → trả về ELIGIBLE (đánh giá lại điều kiện ở lần xét tiếp theo) và xoá chi tiết.
--
--  ⚠️ Chỉ xử lý khoản đang ở IN_SETTLEMENT — khoản PENDING/ELIGIBLE không bị gom
--     vào đợt nên không đụng tới (giữ nguyên lý do bị giữ của khoản đó).
DO $$
BEGIN
    WITH bad_details AS (
        SELECT d.id AS detail_id,
               d.provider_revenue_id AS revenue_id
        FROM settlement_details d
        JOIN settlements s ON s.id = d.settlement_id
        WHERE s.scope = 'BATCH'
          AND s.status = 'DRAFT'
          AND d.revenue_period <> s.revenue_period
    ),
    released AS (
        UPDATE provider_revenues pr
        SET settlement_id = NULL,
            status = 'ELIGIBLE',
            deferred_reason = NULL,
            updated_at = NOW()
        WHERE pr.id IN (SELECT revenue_id FROM bad_details)
          AND pr.status = 'IN_SETTLEMENT'
        RETURNING pr.id
    )
    DELETE FROM settlement_details d
    WHERE d.id IN (SELECT detail_id FROM bad_details);
END $$;

-- 1b. Giải phóng khoản doanh thu còn TRỎ TỚI đợt DRAFT nhưng không có chi tiết
--     (liên kết bị lệch — cơ chế "tự vá" trong BatchSettlementService).
DO $$
BEGIN
    UPDATE provider_revenues pr
    SET settlement_id = NULL,
        status = 'ELIGIBLE',
        deferred_reason = NULL,
        updated_at = NOW()
    WHERE pr.status = 'IN_SETTLEMENT'
      AND pr.settlement_id IS NOT NULL
      AND EXISTS (
            SELECT 1 FROM settlements s
            WHERE s.id = pr.settlement_id
              AND s.scope = 'BATCH'
              AND s.status = 'DRAFT')
      AND NOT EXISTS (
            SELECT 1 FROM settlement_details d
            WHERE d.provider_revenue_id = pr.id
              AND d.settlement_id = pr.settlement_id);
END $$;

-- 1c. Tính lại số tiền của các đợt DRAFT còn lại — LẤY TỪ KHOẢN DOANH THU THẬT
--     (không dùng ảnh chụp trong settlement_details) để khớp với cách
--     BatchSettlementService dựng bản nháp.
UPDATE settlements s
SET gross_amount      = COALESCE(t.gross, 0),
    refund_amount     = COALESCE(t.refund, 0),
    commission_amount = COALESCE(t.commission, 0),
    adjustment_amount = COALESCE(t.adjustment, 0),
    settlement_amount = COALESCE(t.net, 0),
    partner_count     = COALESCE(t.partners, 0),
    updated_at        = NOW()
FROM (
    SELECT d.settlement_id,
           SUM(pr.gross_amount)      AS gross,
           SUM(pr.refund_amount)     AS refund,
           SUM(pr.commission_amount) AS commission,
           SUM(pr.adjustment_amount) AS adjustment,
           SUM(pr.provider_net_amount) AS net,
           COUNT(DISTINCT d.provider_profile_id) AS partners
    FROM settlement_details d
    JOIN provider_revenues pr ON pr.id = d.provider_revenue_id
    JOIN settlements s2 ON s2.id = d.settlement_id
    WHERE s2.scope = 'BATCH'
      AND s2.status = 'DRAFT'
    GROUP BY d.settlement_id
) t
WHERE s.id = t.settlement_id
  AND s.scope = 'BATCH'
  AND s.status = 'DRAFT';

-- 1d. Xoá đợt DRAFT đã rỗng (không còn khoản nào thuộc đúng kỳ của nó).
--     Đợt rỗng không có ý nghĩa gì cho Admin ⇒ bỏ đi, và khoản doanh thu tương ứng
--     (nếu còn) đã được giải phóng ở bước 1a/1b.
DELETE FROM settlements s
WHERE s.scope = 'BATCH'
  AND s.status = 'DRAFT'
  AND NOT EXISTS (
        SELECT 1 FROM settlement_details d WHERE d.settlement_id = s.id);

-- ── 2. CHO PHÉP TẠO LẠI ĐỢT SAU KHI TỪ CHỐI ───────────────────────────────────
--
--  Unique index CHỈ áp cho đợt "còn sống":
--    • DRAFT    — đang chờ Admin duyệt ⇒ chỉ được có 1 đợt.
--    • APPROVED — đã chi tiền ⇒ không được tạo thêm đợt cho cùng kỳ.
--  Đợt REJECTED / CANCELLED không chiếm chỗ ⇒ Admin từ chối xong vẫn tạo lại
--  thủ công cho cùng kỳ được (đúng luồng nghiệp vụ).
--
--  Cột `batch_period_key` là GENERATED (STORED) theo `revenue_period` ⇒ giữ nguyên,
--  chỉ đổi điều kiện WHERE của index.
DROP INDEX IF EXISTS uk_settlement_batch_period;

CREATE UNIQUE INDEX uk_settlement_batch_period
    ON settlements (batch_period_key)
    WHERE scope = 'BATCH' AND status IN ('DRAFT', 'APPROVED');

-- Tương tự cho đợt của MỘT đối tác (scope = PROVIDER).
--
-- ⚠️ `uk_settlement_provider_profile_period` là UNIQUE CONSTRAINT (không phải index
--    độc lập) ⇒ phải DROP CONSTRAINT, không phải DROP INDEX.
-- ⚠️ Thêm DROP INDEX: nếu migration này chạy LẠI (VD DB đã từng chạy bản cũ V50
--    rồi được đánh số lại thành V53), index đã tạo từ lần trước vẫn còn ⇒
--    CREATE UNIQUE INDEX sẽ lỗi "relation already exists".
ALTER TABLE settlements DROP CONSTRAINT IF EXISTS uk_settlement_provider_profile_period;
DROP INDEX IF EXISTS uk_settlement_provider_profile_period;

CREATE UNIQUE INDEX uk_settlement_provider_profile_period
    ON settlements (provider_profile_id, revenue_period)
    WHERE scope = 'PROVIDER' AND status IN ('DRAFT', 'APPROVED');

-- ── 3. KIỂM TRA ──────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_bad INT;
BEGIN
    -- Đợt DRAFT còn chứa khoản ngoài kỳ của nó ⇒ còn sót.
    SELECT count(*) INTO v_bad
    FROM settlement_details d
    JOIN settlements s ON s.id = d.settlement_id
    WHERE s.scope = 'BATCH'
      AND s.status = 'DRAFT'
      AND d.revenue_period <> s.revenue_period;
    IF v_bad > 0 THEN
        RAISE WARNING 'V53: còn % chi tiết trong đợt DRAFT không thuộc đúng kỳ của đợt.', v_bad;
    END IF;

    -- Khoản doanh thu còn trỏ tới đợt DRAFT nhưng đợt đó không còn tồn tại.
    SELECT count(*) INTO v_bad
    FROM provider_revenues pr
    WHERE pr.status = 'IN_SETTLEMENT'
      AND pr.settlement_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM settlements s WHERE s.id = pr.settlement_id);
    IF v_bad > 0 THEN
        RAISE WARNING 'V53: còn % khoản doanh thu trỏ tới đợt không tồn tại.', v_bad;
    END IF;
END $$;
