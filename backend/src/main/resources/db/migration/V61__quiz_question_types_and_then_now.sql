-- Quiz của điểm đến có thêm 3 dạng: chọn ảnh (IMAGE_CHOICE), xếp thứ tự (ORDERING), đoán số bằng thanh trượt (NUMBER).
-- Cột question_type là VARCHAR; bỏ ràng buộc CHECK nếu Hibernate từng tạo để nhận giá trị mới.
ALTER TABLE tour_stop_questions DROP CONSTRAINT IF EXISTS tour_stop_questions_question_type_check;

-- Câu NUMBER: khoảng thanh trượt, đáp án đúng và sai số cho phép.
ALTER TABLE tour_stop_questions ADD COLUMN IF NOT EXISTS number_min INTEGER;
ALTER TABLE tour_stop_questions ADD COLUMN IF NOT EXISTS number_max INTEGER;
ALTER TABLE tour_stop_questions ADD COLUMN IF NOT EXISTS number_correct INTEGER;
ALTER TABLE tour_stop_questions ADD COLUMN IF NOT EXISTS number_tolerance INTEGER;
-- "Tìm quanh bạn": chỉ trả lời được khi đang đứng trong vùng check-in của trạm (GPS) hoặc quét QR trạm.
ALTER TABLE tour_stop_questions ADD COLUMN IF NOT EXISTS requires_presence BOOLEAN NOT NULL DEFAULT FALSE;

-- Câu IMAGE_CHOICE: mỗi đáp án là một ảnh (chữ là chú thích, không bắt buộc).
ALTER TABLE tour_stop_answers ADD COLUMN IF NOT EXISTS image_url VARCHAR(1000);

-- Ảnh "xưa và nay" của điểm đến (tối đa 3 cặp), bắt buộc ghi nguồn ảnh tư liệu.
CREATE TABLE IF NOT EXISTS tour_stop_then_now (
    id             BIGSERIAL PRIMARY KEY,
    stop_id        BIGINT       NOT NULL REFERENCES tour_stops (id) ON DELETE CASCADE,
    sequence_order INTEGER      NOT NULL,
    then_image_url VARCHAR(1000),
    now_image_url  VARCHAR(1000),
    then_label     VARCHAR(50),
    caption        TEXT,
    credit         VARCHAR(300)
);
CREATE INDEX IF NOT EXISTS idx_tour_stop_then_now_stop ON tour_stop_then_now (stop_id, sequence_order);
