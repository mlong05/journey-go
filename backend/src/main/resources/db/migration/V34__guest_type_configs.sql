-- Cấu hình loại khách & độ tuổi do Admin chỉnh (trước đây viết cứng trong enum GuestType).
-- Giữ nguyên 4 mã loại khách; Admin đổi tên hiển thị, tuổi bắt đầu của từng loại và loại nào miễn phí.
-- Khoảng tuổi liền nhau theo thứ tự tuổi tăng dần: INFANT (từ 0) < TODDLER < CHILD < ADULT (không giới hạn trên).
CREATE TABLE IF NOT EXISTS guest_type_configs (
    guest_type  VARCHAR(20) PRIMARY KEY,
    label       VARCHAR(50) NOT NULL,
    min_age     INTEGER     NOT NULL CHECK (min_age >= 0 AND min_age <= 120),
    always_free BOOLEAN     NOT NULL DEFAULT FALSE,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by  BIGINT
);

INSERT INTO guest_type_configs (guest_type, label, min_age, always_free) VALUES
    ('INFANT',  'Em bé',     0,  TRUE),
    ('TODDLER', 'Trẻ nhỏ',   2,  FALSE),
    ('CHILD',   'Trẻ em',    5,  FALSE),
    ('ADULT',   'Người lớn', 12, FALSE)
ON CONFLICT (guest_type) DO NOTHING;
