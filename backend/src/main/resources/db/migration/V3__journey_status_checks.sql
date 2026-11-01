-- =====================================================================================
--  V3 — Làm mới ràng buộc CHECK cột status của các bảng hành trình
-- =====================================================================================
--  Các bảng journeys / journey_destination_progress / journey_task_progress do Hibernate
--  (ddl-auto: update) tạo. Hibernate sinh CHECK (status IN (...)) theo enum lúc tạo bảng
--  và KHÔNG cập nhật lại khi enum có thêm giá trị. Vì vậy database cũ chặn các trạng thái
--  thêm về sau (vd. FAILED khi du khách hết lượt làm nhiệm vụ) với lỗi
--  "violates check constraint journey_task_progress_status_check".
--
--  Migration này dựng lại ràng buộc theo enum hiện tại. Bảng chưa tồn tại (database mới)
--  thì bỏ qua: Hibernate sẽ tạo bảng với ràng buộc đúng. Chạy lại nhiều lần vẫn an toàn.
--  Khi thêm giá trị mới vào các enum này, hãy thêm một migration tương tự.
-- =====================================================================================

DO $$
BEGIN
    IF to_regclass('public.journey_task_progress') IS NOT NULL THEN
        ALTER TABLE journey_task_progress DROP CONSTRAINT IF EXISTS journey_task_progress_status_check;
        ALTER TABLE journey_task_progress ADD CONSTRAINT journey_task_progress_status_check
            CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'SKIPPED'));
    END IF;

    IF to_regclass('public.journey_destination_progress') IS NOT NULL THEN
        ALTER TABLE journey_destination_progress DROP CONSTRAINT IF EXISTS journey_destination_progress_status_check;
        ALTER TABLE journey_destination_progress ADD CONSTRAINT journey_destination_progress_status_check
            CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'NO_SHOW', 'SKIPPED'));
    END IF;

    IF to_regclass('public.journeys') IS NOT NULL THEN
        ALTER TABLE journeys DROP CONSTRAINT IF EXISTS journeys_status_check;
        ALTER TABLE journeys ADD CONSTRAINT journeys_status_check
            CHECK (status IN ('NOT_STARTED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'));
    END IF;
END $$;
