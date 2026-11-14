-- Câu hỏi quiz của điểm đến có 2 dạng: trắc nghiệm (mặc định, như dữ liệu cũ) hoặc tự luận.
ALTER TABLE tour_stop_questions
    ADD COLUMN IF NOT EXISTS question_type VARCHAR(20) NOT NULL DEFAULT 'MULTIPLE_CHOICE';

-- Đáp án gợi ý cho câu tự luận (không bắt buộc).
ALTER TABLE tour_stop_questions
    ADD COLUMN IF NOT EXISTS reference_answer TEXT;
