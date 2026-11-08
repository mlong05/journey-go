-- Nhiệm vụ không còn chọn loại: mỗi nhiệm vụ nhận một mức điểm chung do Admin cấu hình.
-- Điểm theo câu quiz không còn dùng.
DELETE FROM reward_settings WHERE code = 'QUIZ_QUESTION';
INSERT INTO reward_settings (code, points, updated_at) VALUES ('TOUR_TASK', 50, NOW())
ON CONFLICT (code) DO NOTHING;
