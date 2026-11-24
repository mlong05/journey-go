-- Bỏ tùy chọn "Tìm quanh bạn" của câu đố văn hóa (thêm ở V61): câu đố không kiểm tra vị trí lúc trả lời nữa.
ALTER TABLE tour_stop_questions DROP COLUMN IF EXISTS requires_presence;
