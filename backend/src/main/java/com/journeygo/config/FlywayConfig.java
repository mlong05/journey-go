package com.journeygo.config;

import jakarta.persistence.EntityManagerFactory;
import lombok.extern.slf4j.Slf4j;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;

/**
 * Chạy Flyway theo HAI PHA khi database còn trống.
 *
 * Bối cảnh: các bảng cũ (users, roles, destinations...) do Hibernate `ddl-auto=update` tạo,
 * còn các bảng nghiệp vụ mới do Flyway tạo. Spring Boot luôn chạy Flyway TRƯỚC Hibernate.
 *  - V1, V2, V5 chạy trước Hibernate: V1, V2 tự tạo bảng kèm UNIQUE constraint (chống trùng
 *    payment/refund/settlement), V5 đổi tên schema partner → provider_profile.
 *    Chúng không bắt buộc bảng của Hibernate phải tồn tại.
 *  - Migration mới cần khóa ngoại tới `users` / `destinations` phải đặt sau
 *    {@link #PRE_HIBERNATE_TARGET} (trên DB trống sẽ lỗi "relation users does not exist").
 *
 * Cách xử lý:
 *  - DB đã có bảng `users` (DB đang dùng bình thường): chạy toàn bộ migration như cũ, không đổi gì.
 *  - DB chưa có bảng `users` (vừa xóa / tạo mới): chỉ chạy tới {@link #PRE_HIBERNATE_TARGET},
 *    đợi Hibernate tạo xong bảng, rồi mới chạy nốt các migration còn lại.
 *
 * Không sửa nội dung file migration nào → checksum giữ nguyên, máy khác không bị lỗi validate.
 */
@Slf4j
@Configuration
@ConditionalOnProperty(prefix = "spring.flyway", name = "enabled", matchIfMissing = true)
public class FlywayConfig {

    /**
     * Phiên bản migration cuối cùng KHÔNG phụ thuộc bảng do Hibernate tạo.
     *
     * V5 (đổi tên partner → provider_profile) PHẢI chạy trước Hibernate: nếu Hibernate chạy trước,
     * nó tự thêm cột/constraint tên mới (vd. uk_wallet_provider_profile) song song với tên cũ của V1,
     * và lệnh RENAME CONSTRAINT trong V5 sẽ lỗi "already exists". Mọi thao tác của V5 lên
     * `roles` / `users` đã được bọc `to_regclass(...) IS NOT NULL` nên chạy được trên DB trống.
     * V3, V4 đã bị gỡ khỏi code.
     */
    static final String PRE_HIBERNATE_TARGET = "5";

    @Bean
    public FlywayMigrationStrategy twoPhaseFlywayMigrationStrategy() {
        return flyway -> {
            DataSource dataSource = flyway.getConfiguration().getDataSource();
            forgetRenumberedTourTaskMigrations(dataSource);
            if (hibernateTablesExist(dataSource)) {
                flyway.migrate();
                return;
            }
            log.info("[Flyway] Database trống: chạy migration tới V{} trước, phần còn lại chạy sau khi Hibernate tạo bảng.",
                    PRE_HIBERNATE_TARGET);
            Flyway.configure()
                    .configuration(flyway.getConfiguration())
                    .target(PRE_HIBERNATE_TARGET)
                    .load()
                    .migrate();
        };
    }

    /**
     * Pha 2: bean này phụ thuộc EntityManagerFactory nên chỉ được khởi tạo sau khi Hibernate
     * đã tạo/cập nhật schema, và trước các CommandLineRunner seed dữ liệu (DataInitializer).
     * Trên DB đã migrate đủ thì migrate() không làm gì.
     */
    @Bean
    public InitializingBean flywayPostHibernateMigration(Flyway flyway, EntityManagerFactory entityManagerFactory) {
        return () -> {
            var result = flyway.migrate();
            if (result.migrationsExecuted > 0) {
                log.info("[Flyway] Đã chạy thêm {} migration sau khi Hibernate tạo bảng.", result.migrationsExecuted);
            }
        };
    }

    /**
     * Ba migration nhiệm vụ của tour từng mang số V14–V16 trước khi bị đổi thành V15–V17
     * (V14 trên main là partner_profile_update_request). DB đã chạy bản số cũ sẽ lỗi
     * "checksum mismatch" cho version 14–16. Xóa đúng 3 dòng lịch sử cũ đó (khớp cả version lẫn
     * tên) để Flyway chạy lại theo thứ tự mới; cả 3 migration đều idempotent (IF NOT EXISTS /
     * ON CONFLICT) nên chạy lại trên DB đã có bảng vẫn an toàn. DB chưa từng chạy bản cũ: không làm gì.
     */
    private static void forgetRenumberedTourTaskMigrations(DataSource dataSource) {
        try (Connection conn = dataSource.getConnection()) {
            try (PreparedStatement check = conn.prepareStatement("SELECT to_regclass('flyway_schema_history') IS NOT NULL");
                 ResultSet rs = check.executeQuery()) {
                if (!rs.next() || !rs.getBoolean(1)) return;
            }
            try (PreparedStatement ps = conn.prepareStatement("""
                    DELETE FROM flyway_schema_history
                    WHERE (version = '14' AND description = 'tour stop tasks')
                       OR (version = '15' AND description = 'tour stop tasks under stop')
                       OR (version = '16' AND description = 'tour task reward')
                    """)) {
                int removed = ps.executeUpdate();
                if (removed > 0) {
                    log.warn("[Flyway] Đã xóa {} dòng lịch sử của migration nhiệm vụ tour mang số cũ (V14–V16); "
                            + "chúng sẽ chạy lại với số mới V15–V17.", removed);
                }
            }
        } catch (SQLException e) {
            throw new IllegalStateException("Không dọn được lịch sử Flyway của migration nhiệm vụ tour", e);
        }
    }

    private static boolean hibernateTablesExist(DataSource dataSource) {
        try (Connection conn = dataSource.getConnection();
             PreparedStatement ps = conn.prepareStatement("SELECT to_regclass('users') IS NOT NULL");
             ResultSet rs = ps.executeQuery()) {
            return rs.next() && rs.getBoolean(1);
        } catch (SQLException e) {
            throw new IllegalStateException("Không kiểm tra được schema trước khi chạy Flyway", e);
        }
    }
}
