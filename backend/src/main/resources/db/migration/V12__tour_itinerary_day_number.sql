-- Ngày bỏ trống (mọi cột null) bị Hibernate đọc thành phần tử null rồi INSERT trùng khóa khi lưu lại.
-- Thêm cột bắt buộc day_number để một ngày không bao giờ "rỗng hoàn toàn".
ALTER TABLE tour_itinerary_days ADD COLUMN IF NOT EXISTS day_number INTEGER;
UPDATE tour_itinerary_days SET day_number = position + 1 WHERE day_number IS NULL;
ALTER TABLE tour_itinerary_days ALTER COLUMN day_number SET NOT NULL;
