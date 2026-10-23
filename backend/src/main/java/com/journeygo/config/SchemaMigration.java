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
