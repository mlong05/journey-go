-- Quay lại: điểm đến → quiz (1–4 câu, chỉ trắc nghiệm) + trải nghiệm thực tế (1–5, câu hỏi sau trải nghiệm
-- chỉ nhập chữ, có đáp án đúng). Chuyển dữ liệu "nhiệm vụ theo loại" do V19 tạo về lại điểm đến:
--   nhiệm vụ có hoạt động thực tế → trải nghiệm (câu hỏi của nhiệm vụ → câu hỏi sau trải nghiệm);
--   nhiệm vụ không có hoạt động  → câu hỏi quiz của điểm đến.
-- Bảng tour_stop_tasks / cột task_id giữ lại nhưng không dùng.

-- ── 1. Câu hỏi của nhiệm vụ có hoạt động → câu hỏi sau trải nghiệm ─────────────────────────────
UPDATE tour_stop_questions q
SET experience_id = e.id, task_id = NULL, stop_id = NULL, kind = 'POST_EXPERIENCE'
FROM tour_stop_experiences e
WHERE e.task_id IS NOT NULL AND q.task_id = e.task_id;

-- Câu hỏi sau trải nghiệm chỉ nhập chữ: câu trắc nghiệm → nhập chữ, đáp án đúng = nội dung đáp án đúng.
UPDATE tour_stop_questions q
SET question_type = 'TEXT',
    reference_answer = COALESCE(q.reference_answer,
        (SELECT a.content FROM tour_stop_answers a
         WHERE a.question_id = q.id AND a.is_correct ORDER BY a.sequence_order LIMIT 1))
WHERE q.kind = 'POST_EXPERIENCE' AND q.question_type = 'MULTIPLE_CHOICE';

DELETE FROM tour_stop_answers a
USING tour_stop_questions q
WHERE a.question_id = q.id AND q.kind = 'POST_EXPERIENCE' AND q.question_type = 'TEXT';

-- Điểm đã chốt của câu hỏi → điểm của trải nghiệm (thiết kế này chốt điểm theo trải nghiệm).
UPDATE tour_stop_experiences e
SET points_reward = q.points_reward
FROM tour_stop_questions q
WHERE q.experience_id = e.id AND q.points_reward IS NOT NULL AND e.points_reward IS NULL;

-- ── 2. Câu hỏi của nhiệm vụ không có hoạt động → quiz của điểm đến (giữ thứ tự nhiệm vụ rồi câu) ──
WITH ordered AS (
    SELECT q.id, t.stop_id,
           ROW_NUMBER() OVER (PARTITION BY t.stop_id ORDER BY t.sequence_order, t.id, q.sequence_order, q.id) AS rn
    FROM tour_stop_questions q
    JOIN tour_stop_tasks t ON t.id = q.task_id
)
UPDATE tour_stop_questions q
SET stop_id = o.stop_id, task_id = NULL, kind = 'QUIZ', sequence_order = o.rn
FROM ordered o
WHERE q.id = o.id;

-- ── 3. Trải nghiệm: bỏ liên kết nhiệm vụ, đánh lại thứ tự theo thứ tự nhiệm vụ ─────────────────
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

-- ── 4. Điểm thưởng: mỗi câu quiz và mỗi trải nghiệm thực tế (Admin cấu hình) ────────────────────
INSERT INTO reward_settings (code, points, updated_at) VALUES
    ('QUIZ_QUESTION', 10, NOW()),
    ('REAL_WORLD_EXPERIENCE', 50, NOW())
ON CONFLICT (code) DO NOTHING;
