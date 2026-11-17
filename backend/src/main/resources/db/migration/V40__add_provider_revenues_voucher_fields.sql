-- Migration V29: Bổ sung các cột voucher vào bảng provider_revenues

ALTER TABLE provider_revenues ADD COLUMN IF NOT EXISTS voucher_discount NUMERIC(14, 2) NOT NULL DEFAULT 0;
ALTER TABLE provider_revenues ADD COLUMN IF NOT EXISTS voucher_scope VARCHAR(20);
