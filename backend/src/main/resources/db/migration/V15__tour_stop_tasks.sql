-- Trải nghiệm thực tế gồm nhiều nhiệm vụ; mỗi nhiệm vụ chọn một loại (task_type, Admin quản lý)
-- và có thể kèm câu hỏi (trắc nghiệm / tự luận).
--
-- Không đặt FK tới task_type ở đây: bảng task_type do Hibernate (ddl-auto) tạo, có thể chưa tồn tại
-- khi Flyway chạy trên DB mới.
CREATE TABLE IF NOT EXISTS tour_stop_tasks (
    id             BIGSERIAL PRIMARY KEY,
    experience_id  BIGINT  NOT NULL REFERENCES tour_stop_experiences(id) ON DELETE CASCADE,
    task_type_id   BIGINT,
    sequence_order INTEGER NOT NULL,
    title          VARCHAR(200),
    description    TEXT,
    points_reward  INTEGER
);
CREATE INDEX IF NOT EXISTS idx_tour_stop_tasks_experience ON tour_stop_tasks (experience_id, sequence_order);

-- Câu hỏi của nhiệm vụ (kind = TASK).
ALTER TABLE tour_stop_questions
    ADD COLUMN IF NOT EXISTS task_id BIGINT REFERENCES tour_stop_tasks(id) ON DELETE CASCADE;
ALTER TABLE tour_stop_questions DROP CONSTRAINT IF EXISTS tour_stop_questions_kind_check;

-- Điểm trải nghiệm giờ tính theo từng nhiệm vụ (PointRule của loại nhiệm vụ).
DELETE FROM reward_settings WHERE code = 'REAL_WORLD_EXPERIENCE';

-- Câu hỏi POST_EXPERIENCE cũ được chuyển thành nhiệm vụ loại QUIZ bởi runner
-- SchemaMigration.migratePostExperienceQuestionsToTasks (cần task_type đã được seed).
