package com.journeygo.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

/**
 * Các thay đổi schema nhỏ không thuộc phạm vi `spring.jpa.hibernate.ddl-auto=update`.
 *
 * Hibernate `update` chỉ TẠO/BỔ SUNG cột và bảng, KHÔNG xoá cột cũ. Vì vậy khi
 * bỏ trường `tours.price`, cột cũ vẫn còn trong DB và gây lỗi khi INSERT
 * (cột NOT NULL không có default). Runner bên dưới chủ động dọn cột thừa.
 *
 * Runner này idempotent: chạy lại nhiều lần vẫn an toàn.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class SchemaMigration {

    private final JdbcTemplate jdbcTemplate;

    @Bean
    public CommandLineRunner dropLegacyTourPriceColumn() {
        return args -> {
            if (!columnExists("tours", "price")) {
                log.info("[Migration] Cột tours.price đã được gỡ bỏ trước đó — bỏ qua.");
                return;
            }

            jdbcTemplate.execute("ALTER TABLE tours DROP COLUMN IF EXISTS price");
            log.info("[Migration] Đã gỡ cột tours.price — giá tour giờ tính động từ Experience.");
        };
    }

    /**
     * Đổi MỘT LẦN toàn bộ mã QR trạm check-in đã tạo trước 2026-10-29. Các mã đó có thể đã lộ: API công khai
     * từng trả qr_token, giao diện cũ gửi mã sang api.qrserver.com để vẽ ảnh, và cách sinh cũ dễ đoán
     * (tên trạm + 6 chữ số). Đánh dấu vào data_migration_marker để không đổi lại ở các lần khởi động sau;
     * provider cần in lại QR các trạm (Quản lý điểm đến → trải nghiệm → "QR các trạm").
     */
    @Bean
    public CommandLineRunner rotateLeakedCheckInPointQrTokens() {
        return args -> {
            final String marker = "rotate_check_in_point_qr_2026_10";
            if (!columnExists("check_in_point", "qr_token")) {
                return;
            }
            jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS data_migration_marker (
                        name VARCHAR(100) PRIMARY KEY,
                        applied_at TIMESTAMP NOT NULL DEFAULT now()
                    )
                    """);
            Integer done = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM data_migration_marker WHERE name = ?", Integer.class, marker);
            if (done != null && done > 0) {
                return;
            }
            int rotated = jdbcTemplate.update("""
                    UPDATE check_in_point
                    SET qr_token = 'JGS-' || upper(substr(md5(random()::text || id::text || clock_timestamp()::text), 1, 16))
                    """);
            jdbcTemplate.update("INSERT INTO data_migration_marker (name) VALUES (?)", marker);
            log.warn("[Migration] Đã đổi mã QR của {} trạm check-in vì mã cũ có thể đã lộ. "
                    + "Provider cần in lại QR các trạm.", rotated);
        };
    }

    /**
     * Điểm đến tạo trước khi có mã QR check-in thì chưa có qr_token: sinh mã ngẫu nhiên cho từng dòng
     * (cùng định dạng Destination.newQrToken: JGD- + 16 ký tự hex in hoa).
     */
    @Bean
    public CommandLineRunner backfillDestinationQrTokens() {
        return args -> {
            if (!columnExists("destinations", "qr_token")) {
                return;
            }
            int updated = jdbcTemplate.update("""
                    UPDATE destinations
                    SET qr_token = 'JGD-' || upper(substr(md5(random()::text || id::text || clock_timestamp()::text), 1, 16))
                    WHERE qr_token IS NULL
                    """);
            if (updated > 0) {
                log.info("[Migration] Đã sinh mã QR check-in cho {} điểm đến.", updated);
            }
        };
    }

    /**
     * Nhiệm vụ đi theo trạng thái của Experience (xem ExperienceService.changeStatus). Trước khi có
     * quy tắc này, Experience đã PUBLISHED vẫn giữ Task ở DRAFT nên hành trình của du khách không thấy
     * nhiệm vụ nào. Runner xuất bản các Task DRAFT đó; Task INACTIVE (xoá mềm) giữ nguyên.
     */
    @Bean
    public CommandLineRunner publishTasksOfPublishedExperiences() {
        return args -> {
            if (!columnExists("task", "status") || !columnExists("experience", "status")) {
                return;
            }
            int updated = jdbcTemplate.update("""
                    UPDATE task SET status = 'PUBLISHED'
                    WHERE status = 'DRAFT'
                      AND experience_id IN (SELECT id FROM experience WHERE status = 'PUBLISHED')
                    """);
            if (updated > 0) {
                log.info("[Migration] Đã xuất bản {} nhiệm vụ thuộc trải nghiệm đã PUBLISHED.", updated);
            }
        };
    }

    /**
     * Điểm thưởng nay nằm ở cấp nhiệm vụ (task.points_reward); câu hỏi không còn có điểm riêng.
     * Cột question.points cũ là NOT NULL không default nên phải gỡ, nếu không INSERT câu hỏi mới sẽ lỗi.
     */
    @Bean
    public CommandLineRunner dropLegacyQuestionPointsColumn() {
        return args -> {
            if (!columnExists("question", "points")) {
                log.info("[Migration] Cột question.points đã được gỡ bỏ trước đó — bỏ qua.");
                return;
            }

            jdbcTemplate.execute("ALTER TABLE question DROP COLUMN IF EXISTS points");
            log.info("[Migration] Đã gỡ cột question.points — điểm thưởng tính ở cấp nhiệm vụ.");
        };
    }

    /**
     * Gỡ cột {@code users.role} legacy (kiểu {@code varchar}, NOT NULL + CHECK constraint).
     *
     * <p>Sau khi refactor {@code Role} thành entity (quan hệ 1-N), Hibernate map role sang
     * {@code users.role_id}. Cột {@code users.role} cũ vẫn còn trong DB vì
     * {@code ddl-auto=update} không drop cột, và vì NOT NULL nên mọi lần INSERT user mới
     * đều fail với "null value in column \"role\" ... violates not-null constraint".
     */
    @Bean
    public CommandLineRunner dropLegacyUsersRoleColumn() {
        return args -> {
            if (!columnExists("users", "role")) {
                log.info("[Migration] Cột users.role đã được gỡ bỏ trước đó — bỏ qua.");
                return;
            }

            jdbcTemplate.execute("ALTER TABLE users DROP COLUMN IF EXISTS role");
            log.info("[Migration] Đã gỡ cột users.role — role hiện được lưu qua users.role_id.");
        };
    }

    /**
     * Cấu trúc mới: điểm đến → nhiệm vụ → (quiz, trải nghiệm thực tế → câu hỏi sau trải nghiệm).
     * <ol>
     *   <li>Hoàn tác bản tạm V14 (nhiệm vụ nằm trong trải nghiệm, câu hỏi kind = TASK): câu hỏi trở lại
     *       thành câu hỏi sau trải nghiệm, xóa các nhiệm vụ tạm đó.</li>
     *   <li>Điểm đến còn quiz / trải nghiệm gắn thẳng vào điểm đến: tạo "Nhiệm vụ 1"
     *       và chuyển toàn bộ quiz, trải nghiệm vào nhiệm vụ đó.</li>
     * </ol>
     * Mỗi câu lệnh chỉ xử lý dòng chưa chuyển nên chạy lại nhiều lần vẫn an toàn.
     */
    @Bean
    public CommandLineRunner migrateTourStopsToTasks() {
        return args -> {
            if (!columnExists("tour_stop_tasks", "stop_id") || !columnExists("tour_stop_experiences", "task_id")) {
                return;
            }
            int reverted = jdbcTemplate.update("""
                    UPDATE tour_stop_questions q
                    SET experience_id = t.experience_id, task_id = NULL, kind = 'POST_EXPERIENCE'
                    FROM tour_stop_tasks t
                    WHERE q.task_id = t.id AND t.experience_id IS NOT NULL AND t.stop_id IS NULL
                    """);
            jdbcTemplate.update("DELETE FROM tour_stop_tasks WHERE experience_id IS NOT NULL AND stop_id IS NULL");

            int created = jdbcTemplate.update("""
                    INSERT INTO tour_stop_tasks (stop_id, sequence_order, title)
                    SELECT s.id, 1, 'Nhiệm vụ 1'
                    FROM tour_stops s
                    WHERE NOT EXISTS (SELECT 1 FROM tour_stop_tasks t WHERE t.stop_id = s.id)
                      AND (EXISTS (SELECT 1 FROM tour_stop_questions q
                                   WHERE q.stop_id = s.id AND q.kind = 'QUIZ' AND q.task_id IS NULL)
                        OR EXISTS (SELECT 1 FROM tour_stop_experiences e
                                   WHERE e.stop_id = s.id AND e.task_id IS NULL))
                    """);
            int quiz = jdbcTemplate.update("""
                    UPDATE tour_stop_questions q
                    SET task_id = (SELECT t.id FROM tour_stop_tasks t WHERE t.stop_id = q.stop_id
                                   ORDER BY t.sequence_order, t.id LIMIT 1),
                        stop_id = NULL
                    WHERE q.kind = 'QUIZ' AND q.task_id IS NULL AND q.stop_id IS NOT NULL
                    """);
            int experiences = jdbcTemplate.update("""
                    UPDATE tour_stop_experiences e
                    SET task_id = (SELECT t.id FROM tour_stop_tasks t WHERE t.stop_id = e.stop_id
                                   ORDER BY t.sequence_order, t.id LIMIT 1)
                    WHERE e.task_id IS NULL
                    """);
            if (reverted + created + quiz + experiences > 0) {
                log.info("[Migration] Chuyển sang nhiệm vụ: hoàn tác {} câu hỏi tạm, tạo {} nhiệm vụ, chuyển {} câu quiz và {} trải nghiệm.",
                        reverted, created, quiz, experiences);
            }
        };
    }

    /**
     * Kiểm tra cột có tồn tại trong bảng hay không (PostgreSQL).
     */
    private boolean columnExists(String tableName, String columnName) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*)
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = ?
                  AND column_name = ?
                """,
                Integer.class,
                tableName,
                columnName
        );
        return count != null && count > 0;
    }
}
