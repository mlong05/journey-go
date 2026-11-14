-- Migration V8: Thêm cấu hình Voucher Nền tảng (PLATFORM) và Voucher Đối tác (PARTNER)

-- 1. Tạo bảng vouchers nếu chưa tồn tại hoặc thêm cột nếu đã có
CREATE TABLE IF NOT EXISTS vouchers (
    id BIGSERIAL PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE,
    title VARCHAR(150) NOT NULL,
    description VARCHAR(500),
    voucher_scope VARCHAR(20) NOT NULL DEFAULT 'PLATFORM',
    partner_id BIGINT REFERENCES provider_profiles(id) ON DELETE SET NULL,
    discount_type VARCHAR(20) NOT NULL DEFAULT 'FIXED_AMOUNT',
    discount_value NUMERIC(12, 2) NOT NULL,
    min_order_amount NUMERIC(12, 2),
    max_discount_amount NUMERIC(12, 2),
    points_required INT NOT NULL DEFAULT 0,
    total_quantity INT NOT NULL DEFAULT 0,
    remaining_quantity INT NOT NULL DEFAULT 0,
    valid_days INT NOT NULL DEFAULT 30,
    start_date TIMESTAMPTZ,
    end_date TIMESTAMPTZ,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Bổ sung cột nếu bảng vouchers đã tồn tại từ trước mà chưa có voucher_scope và partner_id
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS voucher_scope VARCHAR(20) NOT NULL DEFAULT 'PLATFORM';
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS partner_id BIGINT REFERENCES provider_profiles(id) ON DELETE SET NULL;
ALTER TABLE vouchers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Tạo các chỉ mục tối ưu truy vấn
CREATE INDEX IF NOT EXISTS idx_vouchers_scope ON vouchers(voucher_scope);
CREATE INDEX IF NOT EXISTS idx_vouchers_partner ON vouchers(partner_id);
CREATE INDEX IF NOT EXISTS idx_vouchers_active ON vouchers(is_active);
CREATE INDEX IF NOT EXISTS idx_vouchers_code ON vouchers(code);
