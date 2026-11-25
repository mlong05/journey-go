-- Câu đố "Nối cột" (MATCHING): mỗi dòng đáp án là một cặp đúng — content = cột A (có thể kèm image_url), match_text = cột B.
ALTER TABLE tour_stop_answers ADD COLUMN IF NOT EXISTS match_text VARCHAR(1000);
