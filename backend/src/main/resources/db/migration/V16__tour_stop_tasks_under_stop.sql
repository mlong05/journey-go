-- Nhiệm vụ chuyển lên cấp điểm đến: điểm đến → nhiệm vụ → (quiz, trải nghiệm thực tế).
-- Dữ liệu cũ (quiz / trải nghiệm gắn thẳng vào điểm đến, hoặc nhiệm vụ nằm trong trải nghiệm theo V15)
-- được chuyển bởi runner SchemaMigration.migrateTourStopsToTasks (cần task_type đã được seed).

ALTER TABLE tour_stop_tasks
    ADD COLUMN IF NOT EXISTS stop_id BIGINT REFERENCES tour_stops(id) ON DELETE CASCADE;
ALTER TABLE tour_stop_tasks ALTER COLUMN experience_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_tour_stop_tasks_stop ON tour_stop_tasks (stop_id, sequence_order);

ALTER TABLE tour_stop_experiences
    ADD COLUMN IF NOT EXISTS task_id BIGINT REFERENCES tour_stop_tasks(id) ON DELETE CASCADE;
