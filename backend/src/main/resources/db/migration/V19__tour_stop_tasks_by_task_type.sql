-- Điểm đến → nhiệm vụ (1–5, thứ tự tự do). Mỗi nhiệm vụ chọn LOẠI (task_type, Admin quản lý) rồi mới tới nội dung:
--   loại không cần vị trí (vd. Quiz)          → 1–4 câu hỏi theo dạng của loại (trắc nghiệm);
--   loại cần vị trí (vd. Tương tác thực tế)   → 1 hoạt động (checkpoint, bán kính, đếm ngược) + 1 câu hỏi nhập chữ.
-- Điểm thưởng tính theo từng câu hỏi, mức "điểm mỗi câu" của từng loại = point_rule.base_points.

-- ── 1. Loại nhiệm vụ: dạng câu hỏi + tên hiển thị ─────────────────────────────────────────────
ALTER TABLE IF EXISTS task_type ADD COLUMN IF NOT EXISTS question_format VARCHAR(20);
UPDATE task_type
SET question_format = CASE WHEN requires_location THEN 'TEXT' ELSE 'MULTIPLE_CHOICE' END
WHERE question_format IS NULL;
UPDATE task_type SET name = 'Quiz – câu hỏi trắc nghiệm'
WHERE code = 'QUIZ' AND name = 'Câu hỏi trắc nghiệm / text (4 phương án)';
UPDATE task_type SET name = 'Tương tác thực tế'
WHERE code = 'REAL_WORLD_INTERACTIVE' AND name = 'Câu hỏi tương tác ngoài thực tế (GPS check-in trước khi trả lời)';

-- ── 2. Điểm mỗi câu: lấy theo cấu hình cũ (điểm mỗi câu quiz / mỗi trải nghiệm) ────────────────
UPDATE point_rule pr
SET base_points = rs.points
FROM task_type tt, reward_settings rs
WHERE pr.task_type_id = tt.id
  AND ((tt.code = 'QUIZ' AND rs.code = 'QUIZ_QUESTION')
    OR (tt.code = 'REAL_WORLD_INTERACTIVE' AND rs.code = 'REAL_WORLD_EXPERIENCE'));

-- ── 3. Quiz của điểm đến → 1 nhiệm vụ loại QUIZ (đứng đầu) ─────────────────────────────────────
ALTER TABLE tour_stop_tasks ADD COLUMN IF NOT EXISTS legacy_experience_id BIGINT;

INSERT INTO tour_stop_tasks (stop_id, task_type_id, sequence_order)
SELECT DISTINCT q.stop_id, (SELECT tt.id FROM task_type tt WHERE tt.code = 'QUIZ' ORDER BY tt.id LIMIT 1), 1
FROM tour_stop_questions q
WHERE q.kind = 'QUIZ' AND q.stop_id IS NOT NULL AND q.task_id IS NULL;

UPDATE tour_stop_questions q
SET task_id = t.id, kind = 'TASK', stop_id = NULL
FROM tour_stop_tasks t
WHERE q.kind = 'QUIZ' AND q.stop_id IS NOT NULL AND q.task_id IS NULL
  AND t.stop_id = q.stop_id AND t.sequence_order = 1 AND t.legacy_experience_id IS NULL;

-- ── 4. Mỗi trải nghiệm → 1 nhiệm vụ loại REAL_WORLD_INTERACTIVE (sau nhiệm vụ quiz) ────────────
INSERT INTO tour_stop_tasks (stop_id, task_type_id, sequence_order, legacy_experience_id)
SELECT e.stop_id,
       (SELECT tt.id FROM task_type tt WHERE tt.code = 'REAL_WORLD_INTERACTIVE' ORDER BY tt.id LIMIT 1),
       ROW_NUMBER() OVER (PARTITION BY e.stop_id ORDER BY e.sequence_order, e.id)
           + CASE WHEN EXISTS (SELECT 1 FROM tour_stop_tasks t
                               WHERE t.stop_id = e.stop_id AND t.legacy_experience_id IS NULL) THEN 1 ELSE 0 END,
       e.id
FROM tour_stop_experiences e
WHERE e.task_id IS NULL;

UPDATE tour_stop_experiences e
SET task_id = t.id, sequence_order = 1
FROM tour_stop_tasks t
WHERE t.legacy_experience_id = e.id;

-- Câu hỏi sau trải nghiệm → câu hỏi của nhiệm vụ; điểm đã chốt của trải nghiệm chuyển vào câu hỏi.
UPDATE tour_stop_questions q
SET task_id = t.id, kind = 'TASK', sequence_order = 1, experience_id = NULL,
    points_reward = COALESCE(q.points_reward, e.points_reward)
FROM tour_stop_tasks t
JOIN tour_stop_experiences e ON e.id = t.legacy_experience_id
WHERE q.experience_id = e.id AND q.task_id IS NULL;

-- Loại cần vị trí dùng câu hỏi nhập chữ: câu trắc nghiệm cũ → nhập chữ, đáp án đúng = nội dung đáp án đúng.
UPDATE tour_stop_questions q
SET question_type = 'TEXT',
    reference_answer = COALESCE(q.reference_answer,
        (SELECT a.content FROM tour_stop_answers a WHERE a.question_id = q.id AND a.is_correct ORDER BY a.sequence_order LIMIT 1))
FROM tour_stop_tasks t
WHERE q.task_id = t.id AND t.legacy_experience_id IS NOT NULL AND q.question_type = 'MULTIPLE_CHOICE';

DELETE FROM tour_stop_answers a
USING tour_stop_questions q, tour_stop_tasks t
WHERE a.question_id = q.id AND q.task_id = t.id AND t.legacy_experience_id IS NOT NULL AND q.question_type = 'TEXT';

ALTER TABLE tour_stop_tasks DROP COLUMN IF EXISTS legacy_experience_id;
