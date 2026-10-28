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
