-- Migration V28: Thêm các trường lưu thông tin voucher đã áp dụng vào bảng bookings

-- 1. Tạo bảng user_vouchers nếu chưa tồn tại
CREATE TABLE IF NOT EXISTS user_vouchers (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL,
    voucher_id BIGINT NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
    user_voucher_code VARCHAR(100) NOT NULL UNIQUE,
    points_spent INT NOT NULL DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
    redeemed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    expiry_date DATE NOT NULL,
    used_at TIMESTAMPTZ,
    used_order_reference VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_user_vouchers_user_id ON user_vouchers(user_id);
CREATE INDEX IF NOT EXISTS idx_user_vouchers_voucher_id ON user_vouchers(voucher_id);
CREATE INDEX IF NOT EXISTS idx_user_vouchers_status ON user_vouchers(status);

-- 2. Bổ sung các cột voucher vào bảng bookings
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS applied_voucher_code VARCHAR(100);
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(14, 2) NOT NULL DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS voucher_scope VARCHAR(20);

CREATE INDEX IF NOT EXISTS idx_bookings_applied_voucher ON bookings(applied_voucher_code);
