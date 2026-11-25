-- Giải thích ngắn cho câu hỏi của điểm đến: hiện cho du khách sau khi nộp câu đố (đúng hay sai đều xem được).
ALTER TABLE tour_stop_questions ADD COLUMN IF NOT EXISTS explanation TEXT;
