-- ═══════════════════════════════════════════════════════════════════════════════
-- V43 — Đợt tất toán TỔNG cho cả sàn (SettlementScope.BATCH)
--
-- Bối cảnh:
--   Trước đây mỗi đợt tất toán (settlements) thuộc MỘT đối tác (provider_profile_id).
--   Khi sàn có nhiều đối tác, Admin phải lập + duyệt từng đợt riêng lẻ ⇒ rất chậm, dễ sót.
--
--   Nay hỗ trợ đợt TỔNG (scope = 'BATCH'): gom khoản doanh thu đủ điều kiện của TẤT CẢ
--   đối tác trong một kỳ vào MỘT đợt. Admin duyệt MỘT lần; tiền vẫn cộng vào ví
--   của TỪNG đối tác theo đúng số tiền của họ.
--
-- Thay đổi:
--   1. settlements.scope        — PROVIDER (mặc định) | BATCH
--   2. settlements.provider_profile_id — cho phép NULL (đợt tổng)
--   3. settlement_details.provider_profile_id — bắt buộc, biết đối tác của mỗi khoản
--   4. uk_settlement_batch_period — chặn trùng 2 đợt tổng cùng kỳ
-- ═══════════════════════════════════════════════════════════════════════════════

-- ── 1. Cột `scope` cho settlements ───────────────────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema() AND table_name = 'settlements'
                     AND column_name = 'scope') THEN
        ALTER TABLE settlements
            ADD COLUMN scope VARCHAR(20) NOT NULL DEFAULT 'PROVIDER';
    END IF;
END $$;

-- Backfill: mọi đợt cũ đều là đợt của MỘT đối tác.
UPDATE settlements SET scope = 'PROVIDER' WHERE scope IS NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                   WHERE schemaname = current_schema() AND indexname = 'idx_settlement_scope') THEN
        CREATE INDEX idx_settlement_scope ON settlements (scope);
    END IF;
END $$;

-- ── 2. Cho phép provider_profile_id NULL (đợt tổng) ───────────────────────────
ALTER TABLE settlements ALTER COLUMN provider_profile_id DROP NOT NULL;

-- ── 3. settlement_details.provider_profile_id ────────────────────────────────
-- Cột này là BẮT BUỘC vì đợt tổng không có đối tác duy nhất.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema() AND table_name = 'settlement_details'
                     AND column_name = 'provider_profile_id') THEN
        ALTER TABLE settlement_details
            ADD COLUMN provider_profile_id BIGINT;
    END IF;
END $$;

-- Backfill từ provider_revenues (khoản doanh thu luôn thuộc một đối tác).
UPDATE settlement_details d
SET provider_profile_id = pr.provider_profile_id
FROM provider_revenues pr
WHERE pr.id = d.provider_revenue_id
  AND d.provider_profile_id IS NULL;

-- Còn sót thì xoá bản ghi mồ côi (không xác định được đối tác ⇒ không cộng tiền được).
DELETE FROM settlement_details
WHERE provider_profile_id IS NULL;

ALTER TABLE settlement_details ALTER COLUMN provider_profile_id SET NOT NULL;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_indexes
                   WHERE schemaname = current_schema() AND indexname = 'idx_settlement_detail_provider_profile') THEN
        CREATE INDEX idx_settlement_detail_provider_profile
            ON settlement_details (provider_profile_id);
    END IF;
END $$;

-- ── 4. Ràng buộc: mỗi kỳ chỉ có MỘT đợt tổng ─────────────────────────────────
-- ⚠️ Ràng buộc cũ `uk_settlement_provider_profile_period (provider_profile_id, revenue_period)`
--    KHÔNG chặn được đợt tổng vì provider_profile_id là NULL (PostgreSQL coi NULL ≠ NULL).
--    ⇒ Dùng cột GENERATED: giá trị khóa = revenue_period khi scope = BATCH, NULL còn lại.
--       Unique index bỏ qua NULL ⇒ chỉ ràng buộc đúng các đợt tổng.
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema() AND table_name = 'settlements'
                     AND column_name = 'batch_period_key') THEN
        ALTER TABLE settlements
            ADD COLUMN batch_period_key VARCHAR(7)
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

-- ── 5. Cột `partner_count` (số đối tác trong đợt) ─────────────────────────────
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                   WHERE table_schema = current_schema() AND table_name = 'settlements'
                     AND column_name = 'partner_count') THEN
        ALTER TABLE settlements
            ADD COLUMN partner_count INTEGER NOT NULL DEFAULT 1;
    END IF;
END $$;

-- Đợt cũ luôn là đợt của MỘT đối tác.
UPDATE settlements SET partner_count = 1 WHERE partner_count IS NULL;

-- ── 6. Ghi chú phạm vi vào bảng ───────────────────────────────────────────────
COMMENT ON COLUMN settlements.scope IS
    'PROVIDER = đợt của một đối tác; BATCH = đợt tổng cho toàn bộ đối tác trong kỳ';
COMMENT ON COLUMN settlements.provider_profile_id IS
    'NULL khi scope = BATCH (đợt tổng gom doanh thu của nhiều đối tác)';
COMMENT ON COLUMN settlement_details.provider_profile_id IS
    'Đối tác sở hữu khoản doanh thu — dùng để cộng tiền vào đúng ví khi duyệt đợt tổng';
