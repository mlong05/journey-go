-- Quay lại thiết kế ban đầu: điểm đến → (quiz 1–4 câu, trải nghiệm thực tế 1–5), không còn cấp "nhiệm vụ".
-- Chuyển dữ liệu do V15–V17 tạo về lại điểm đến. Bảng tour_stop_tasks / cột task_id giữ lại nhưng không dùng.

-- 1. Bản tạm V15 (nhiệm vụ nằm trong trải nghiệm, kind = TASK): trở lại câu hỏi sau trải nghiệm.
UPDATE tour_stop_questions q
SET experience_id = t.experience_id, task_id = NULL, kind = 'POST_EXPERIENCE'
FROM tour_stop_tasks t
WHERE q.task_id = t.id AND t.experience_id IS NOT NULL;

-- 2. Quiz của các nhiệm vụ → quiz của điểm đến (giữ thứ tự nhiệm vụ rồi thứ tự câu).
WITH ordered AS (
    SELECT q.id, t.stop_id,
           ROW_NUMBER() OVER (PARTITION BY t.stop_id ORDER BY t.sequence_order, t.id, q.sequence_order, q.id) AS rn
    FROM tour_stop_questions q
    JOIN tour_stop_tasks t ON t.id = q.task_id
    WHERE q.kind = 'QUIZ' AND t.stop_id IS NOT NULL
)
UPDATE tour_stop_questions q
SET stop_id = o.stop_id, task_id = NULL, sequence_order = o.rn
FROM ordered o
WHERE q.id = o.id;

-- 3. Trải nghiệm của các nhiệm vụ → trải nghiệm của điểm đến (stop_id vẫn còn, chỉ đánh lại thứ tự).
WITH ordered AS (
    SELECT e.id,
           ROW_NUMBER() OVER (PARTITION BY e.stop_id ORDER BY t.sequence_order, t.id, e.sequence_order, e.id) AS rn
    FROM tour_stop_experiences e
    JOIN tour_stop_tasks t ON t.id = e.task_id
)
UPDATE tour_stop_experiences e
SET task_id = NULL, sequence_order = o.rn
FROM ordered o
WHERE e.id = o.id;

DELETE FROM tour_stop_tasks;

-- 4. Điểm thưởng: mỗi câu quiz và mỗi trải nghiệm thực tế (Admin cấu hình); bỏ "điểm mỗi nhiệm vụ".
DELETE FROM reward_settings WHERE code = 'TOUR_TASK';
INSERT INTO reward_settings (code, points, updated_at) VALUES
    ('QUIZ_QUESTION', 10, NOW()),
    ('REAL_WORLD_EXPERIENCE', 50, NOW())
ON CONFLICT (code) DO NOTHING;
