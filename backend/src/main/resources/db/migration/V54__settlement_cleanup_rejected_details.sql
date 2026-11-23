-- =====================================================================================
--  V54 — DON CHI TIET CU DO~T TAT TOAN DA TU CHOI (GOM SAI KY)
-- =====================================================================================
--  ── Vi sao? ──
--  V53 da don cac do~t DRAFT bi gom sai ky. Nhung cac do~t da TU CHOI/ HUY
--  (vi du do~t ST... cua ky 2026-11-2) van con giu chi tiet cua ~299 giao
--  dich cua 21 ky khac nhau. Khi Admin mo modal "Chi tiet" do~t do => thay
--  danh sach lam ky vang chua "doanh thu chuyen tiep" (cua thang 3 -> thang 10)
--  ⇒ dung nguoi dung "ky 11/11 -> 20/11/2026 chua doanh thu cua ky khac".
--
--  Do da TU CHOI khong con "soi" ⇒ xoa het chi tiet va giai phong khoan doanh
--  thu ve trang thai ELIGIBLE de ky cua chung duoc xet lai dung khi tao do~t moi.
-- =====================================================================================

-- ── 1. Giai phong khoan doanh thu bi "keo" vao do~t da TU CHOI ────────────────────
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
              AND s.status IN ('REJECTED', 'CANCELLED'))
      AND NOT EXISTS (
            SELECT 1 FROM settlement_details d
            WHERE d.provider_revenue_id = pr.id
              AND d.settlement_id = pr.settlement_id);
END $$;

-- ── 2. Xoa chi tiet khong thuoc DUNG ky cua do~t ───────────────────────────────
DELETE FROM settlement_details d
USING settlements s
WHERE s.id = d.settlement_id
  AND s.scope = 'BATCH'
  AND s.status IN ('REJECTED', 'CANCELLED')
  AND d.revenue_period <> s.revenue_period;

-- ── 3. Do~t da TU CHOI: giu lai chi tiet dung ky, tinh lai so tien ─────────────
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
           SUM(pr.gross_amount)           AS gross,
           SUM(pr.refund_amount)          AS refund,
           SUM(pr.commission_amount)      AS commission,
           SUM(pr.adjustment_amount)       AS adjustment,
           SUM(pr.provider_net_amount)     AS net,
           COUNT(DISTINCT d.provider_profile_id) AS partners
    FROM settlement_details d
    JOIN provider_revenues pr ON pr.id = d.provider_revenue_id
    JOIN settlements s2 ON s2.id = d.settlement_id
    WHERE s2.scope = 'BATCH'
      AND s2.status IN ('REJECTED', 'CANCELLED')
    GROUP BY d.settlement_id
) t
WHERE s.id = t.settlement_id
  AND s.scope = 'BATCH'
  AND s.status IN ('REJECTED', 'CANCELLED');

-- ── 4. Do~t da TU CHOI ma rong sau khi don => xoa het ─────────────────────────
DELETE FROM settlements s
WHERE s.scope = 'BATCH'
  AND s.status IN ('REJECTED', 'CANCELLED')
  AND NOT EXISTS (
        SELECT 1 FROM settlement_details d WHERE d.settlement_id = s.id);

-- ── 5. KIEM TRA ─────────────────────────────────────────────────────────────────
DO $$
DECLARE
    v_bad INT;
BEGIN
    SELECT count(*) INTO v_bad
    FROM settlement_details d
    JOIN settlements s ON s.id = d.settlement_id
    WHERE s.scope = 'BATCH'
      AND s.status IN ('DRAFT', 'REJECTED', 'CANCELLED')
      AND d.revenue_period <> s.revenue_period;
    IF v_bad > 0 THEN
        RAISE WARNING 'V54: con % chi tiet khong thuoc dung ky cua do~t.', v_bad;
    END IF;

    SELECT count(*) INTO v_bad
    FROM provider_revenues pr
    WHERE pr.status = 'IN_SETTLEMENT'
      AND pr.settlement_id IS NOT NULL
      AND NOT EXISTS (SELECT 1 FROM settlements s WHERE s.id = pr.settlement_id);
    IF v_bad > 0 THEN
        RAISE WARNING 'V54: con % khoan doanh thu tro toi do~t khong ton tai.', v_bad;
    END IF;
END $$;
