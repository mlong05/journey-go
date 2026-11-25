package com.journeygo.config;

import jakarta.persistence.EntityManagerFactory;
import jakarta.persistence.metamodel.Attribute;
import jakarta.persistence.metamodel.EntityType;
import jakarta.persistence.metamodel.SingularAttribute;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.flywaydb.core.Flyway;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.regex.Pattern;

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
            cleanupFailedAchievementMigration(dataSource);
            forgetStaleRenumberedFeatureMigrations(dataSource);
            flyway.repair();
            if (hibernateTablesExist(dataSource)) {
                syncMissingColumnDefaults(dataSource);
                Flyway.configure()
                        .configuration(flyway.getConfiguration())
                        .outOfOrder(true)
                        .load()
                        .migrate();
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
    public InitializingBean flywayPostHibernateMigration(Flyway flyway, EntityManagerFactory entityManagerFactory,
                                                       DataSource dataSource) {
        return () -> {
            // Pha 2 chạy SAU khi Hibernate đã tạo bảng ⇒ lúc này các CHECK constraint do
            // Hibernate sinh cho cột enum đã tồn tại và có thể chặn các migration còn lại.
            dropHibernateEnumCheckConstraints(dataSource, entityManagerFactory);
            // Đồng bộ DEFAULT cho các cột NOT NULL mà Hibernate tạo thiếu (xem giải thích
            // trong {@link #syncMissingColumnDefaults}).
            syncMissingColumnDefaults(dataSource);
            restoreLegacyGuestTypeColumn(dataSource);
            var result = Flyway.configure()
                    .configuration(flyway.getConfiguration())
                    .outOfOrder(true)
                    .load()
                    .migrate();
            if (result.migrationsExecuted > 0) {
                log.info("[Flyway] Đã chạy thêm {} migration sau khi Hibernate tạo bảng.", result.migrationsExecuted);
            }
        };
    }

    /**
     * Bổ sung DEFAULT cho các cột NOT NULL mà Hibernate tạo thiếu.
     *
     * <p>─── Vì sao cần? ───
     * Các bảng nghiệp vụ được định nghĩa trong file migration với dạng
     * {@code active BOOLEAN NOT NULL DEFAULT TRUE}. Nhưng khi DB còn trống, Flyway chạy 2 pha:
     * pha 1 tới V5, Hibernate tạo bảng (theo entity — <b>không khai báo DEFAULT</b>), rồi pha 2
     * chạy các migration còn lại. Vì bảng đã tồn tại, {@code CREATE TABLE IF NOT EXISTS} bị
     * skip ⇒ cột {@code active} có NOT NULL nhưng <b>không có DEFAULT</b>.
     *
     * <p>Hậu quả: {@code INSERT} của chính file migration đó (bỏ trối {@code active}) ⇒ NULL
     * ⇒ vi phạm NOT NULL ⇒ Flyway fail ⇒ ứng dụng không khởi động được trên DB tạo mới.
     *
     * <p>Giải pháp: đọc DDL trong các file migration (classpath {@code db/migration}), tìm
     * cột {@code NOT NULL DEFAULT ...}, rồi {@code ALTER TABLE ... SET DEFAULT} cho các cột
     * hiện đang thiếu DEFAULT trong DB.
     *
     * <p>⚠️ KHÔNG sửa nội dung file migration ⇒ checksum giữ nguyên ⇒ máy khác không lỗi validate.
     */
    private static void syncMissingColumnDefaults(DataSource dataSource) {
        Map<String, String> expectedDefaults = readDefaultsFromMigrationFiles();
        if (expectedDefaults.isEmpty()) return;

        for (Map.Entry<String, String> entry : expectedDefaults.entrySet()) {
            String qualified = entry.getKey();
            String defaultExpr = entry.getValue();
            String[] parts = qualified.split("\\.", 2);
            if (parts.length != 2) continue;
            String table = parts[0];
            String column = parts[1];

            String checkSql = "SELECT pg_get_expr(d.adbin, d.adrelid) FROM pg_attrdef d "
                    + "JOIN pg_attribute a ON a.attrelid = d.adrelid AND a.attnum = d.adnum "
                    + "WHERE d.adrelid = to_regclass(?) AND a.attname = ?";
            try (Connection conn = dataSource.getConnection()) {
                String currentDefault = null;
                try (PreparedStatement ps = conn.prepareStatement(checkSql)) {
                    ps.setString(1, "public." + table);
                    ps.setString(2, column);
                    try (ResultSet rs = ps.executeQuery()) {
                        if (rs.next()) currentDefault = rs.getString(1);
                    }
                }
                if (currentDefault != null) continue; // đã có DEFAULT ⇒ không cần sửa

                String alterSql = "ALTER TABLE public." + quoteIdentifier(table)
                        + " ALTER COLUMN " + quoteIdentifier(column)
                        + " SET DEFAULT " + defaultExpr;
                try (PreparedStatement ps = conn.prepareStatement(alterSql)) {
                    ps.execute();
                    log.info("[Flyway] Đã bổ sung DEFAULT cho cột {}.{} = {}", table, column, defaultExpr);
                }
            } catch (SQLException e) {
                log.warn("[Flyway] Không bổ sung được DEFAULT cho {}.{}: {}", table, column, e.getMessage());
            }
        }
    }

    /**
     * Đọc các file migration trong classpath và trích ra mapping {@code table.column -> DEFAULT expr}
     * cho những cột khai báo {@code NOT NULL DEFAULT ...}.
     */
    private static Map<String, String> readDefaultsFromMigrationFiles() {
        Map<String, String> result = new LinkedHashMap<>();
        // Regex: tên cột, rồi "NOT NULL DEFAULT <expr>".
        Pattern columnPattern = Pattern.compile(
                "(?i)^\\s*([a-z_][a-z0-9_]*)\\s+[A-Za-z][A-Za-z0-9_ ]*?\\s+NOT\\s+NULL\\s+DEFAULT\\s+(.+)");

        try {
            var resourceResolver = new PathMatchingResourcePatternResolver();
            var resources = resourceResolver.getResources("classpath*:db/migration/*.sql");
            for (org.springframework.core.io.Resource resource : resources) {
                String content;
                try (var in = resource.getInputStream()) {
                    content = new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
                }
                String currentTable = null;
                for (String rawLine : content.split("\\R")) {
                    String line = rawLine;
                    // Bỏ comment đầu dòng.
                    int commentIdx = line.indexOf("--");
                    if (commentIdx >= 0) line = line.substring(0, commentIdx);
                    var tableMatcher = Pattern.compile(
                            "(?i)CREATE\\s+TABLE\\s+(?:IF\\s+NOT\\s+EXISTS\\s+)?([a-z_][a-z0-9_]*)\\s*\\(")
                            .matcher(line);
                    if (tableMatcher.find()) {
                        currentTable = tableMatcher.group(1).toLowerCase();
                        continue;
                    }
                    if (currentTable == null) continue;
                    var m = columnPattern.matcher(line);
                    if (m.find()) {
                        String column = m.group(1).toLowerCase();
                        String defaultExpr = extractDefaultExpression(m.group(2).trim());
                        if (defaultExpr != null) {
                            result.putIfAbsent(currentTable + "." + column, defaultExpr);
                        }
                    }
                    if (line.contains(");")) currentTable = null;
                }
            }
        } catch (Exception e) {
            log.warn("[Flyway] Không đọc được định nghĩa DEFAULT trong file migration: {}", e.getMessage());
        }
        return result;
    }

    /**
     * Tách biểu thức DEFAULT khỏi phần còn lại của dòng, xử lý ngoặc lồng nhau.
     *
     * <p>VD: {@code "NOW()," → "NOW()"}, {@code "0," → "0"}, {@code "'ADULT'," → "'ADULT'"}.
     */
    private static String extractDefaultExpression(String rest) {
        int depth = 0;
        boolean inSingleQuote = false;
        for (int i = 0; i < rest.length(); i++) {
            char c = rest.charAt(i);
            if (c == '\'') inSingleQuote = !inSingleQuote;
            if (inSingleQuote) continue;
            if (c == '(') {
                depth++;
            } else if (c == ')') {
                depth--;
            } else if (c == ',' && depth == 0) {
                return rest.substring(0, i).trim();
            }
        }
        return rest.trim().isEmpty() ? null : rest.trim();
    }

    /**
     * Gỡ các CHECK constraint mà Hibernate tự sinh cho cột kiểu enum.
     *
     * <p>─── Vì sao cần? ───
     * Hibernate 6 (dùng ở đây) luôn sinh CHECK constraint cho cột map bằng enum, ví dụ
     * {@code reward_settings.code}:
     * {@code CHECK (code IN ('QUIZ_QUESTION','REAL_WORLD_EXPERIENCE'))}.
     *
     * <p>Các migration giai đoạn trung gian (V17/V18) lại {@code INSERT} các mã reward đã bị
     * gỡ khỏi enum hiện tại (VD: {@code 'TOUR_TASK'}). Trên DB cũ, bảng do Flyway V7 tạo
     * (không có constraint) nên chạy được; nhưng trên DB TẠO MỚI, Hibernate tạo bảng trước
     * (kèm constraint) ⇒ migration V17 VI PHẠM constraint ⇒ Flyway fail ⇒ ứng dụng không
     * khởi động được.
     *
     * <p>Không thể tắt bằng annotation (`@Enumerated` / `@JdbcTypeCode` / `columnDefinition`
     * đều không có tác dụng với Hibernate 6). Giải pháp duy nhất mà không phá checksum
     * migration là gỡ constraint trước khi chạy các migration còn lại.
     *
     * <p>Danh sách cột enum lấy từ Hibernate Metamodel ⇒ chính xác, không đoán theo tên.
     * Tên constraint do Hibernate sinh theo mẫu {@code <table>_<column>_check}.
     */
    private static void dropHibernateEnumCheckConstraints(DataSource dataSource,
                                                          EntityManagerFactory entityManagerFactory) {
        List<String> enumColumns = collectHibernateEnumColumns(entityManagerFactory);
        if (enumColumns.isEmpty()) return;

        for (String qualified : enumColumns) {
            String[] parts = qualified.split("\\.", 2);
            String table = parts[0];
            String column = parts[1];
            // Hibernate đặt tên CHECK constraint theo mẫu <table>_<column>_check.
            String constraint = table + "_" + column + "_check";
            String sql = "ALTER TABLE public." + quoteIdentifier(table)
                    + " DROP CONSTRAINT IF EXISTS " + quoteIdentifier(constraint);
            try (Connection conn = dataSource.getConnection();
                 PreparedStatement ps = conn.prepareStatement(sql)) {
                ps.execute();
                log.info("[Flyway] Đã gỡ CHECK constraint enum do Hibernate sinh: {}", constraint);
            } catch (SQLException e) {
                log.warn("[Flyway] Không gỡ được CHECK constraint {}: {}", constraint, e.getMessage());
            }
        }
    }

    /** Quét Metamodel, tìm các thuộc tính map bằng enum ⇒ trả về "table.column" tương ứng. */
    private static List<String> collectHibernateEnumColumns(EntityManagerFactory emf) {
        List<String> result = new ArrayList<>();
        try {
            for (EntityType<?> entityType : emf.getMetamodel().getEntities()) {
                jakarta.persistence.Table tableAnnotation =
                        entityType.getJavaType().getAnnotation(jakarta.persistence.Table.class);
                if (tableAnnotation == null || tableAnnotation.name().isBlank()) continue;
                String table = tableAnnotation.name();

                for (Attribute<?, ?> attribute : entityType.getAttributes()) {
                    if (!(attribute instanceof SingularAttribute<?, ?> singular)) continue;
                    if (singular.isAssociation()) continue;
                    if (!singular.getJavaType().isEnum()) continue;

                    if (!(singular.getJavaMember() instanceof java.lang.reflect.Field field)) continue;
                    jakarta.persistence.Column columnAnnotation =
                            field.getAnnotation(jakarta.persistence.Column.class);
                    if (columnAnnotation == null || columnAnnotation.name().isBlank()) continue;

                    result.add(table + "." + columnAnnotation.name());
                }
            }
        } catch (Exception e) {
            log.warn("[Flyway] Không quét được Metamodel để tìm cột enum: {}", e.getMessage());
        }
        return result;
    }

    /** Bọc identifier trong dấu nháy kép để tránh lỗi với tên bảng/cột viết hoa hoặc chứa ký tự đặc biệt. */
    private static String quoteIdentifier(String name) {
        return "\"" + name.replace("\"", "\"\"") + "\"";
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
                    WHERE (version = '14' AND (description = 'tour stop tasks' OR script = 'V14__tour_stop_tasks.sql'))
                       OR (version = '15' AND (description = 'tour stop tasks under stop' OR script = 'V15__tour_stop_tasks_under_stop.sql'))
                       OR (version = '16' AND (description = 'tour task reward' OR script = 'V16__tour_task_reward.sql'))
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

    /**
     * Dọn dòng lịch sử V41 bị fail (success = FALSE) trên DB production trước đó do cột
     * {@code badges.created_at} thiếu DEFAULT, để Flyway có thể chạy lại V41 sạch sẽ.
     * Không đụng vào bất kỳ bản ghi nào đã thành công (success = TRUE).
     */
    private static void cleanupFailedAchievementMigration(DataSource dataSource) {
        try (Connection conn = dataSource.getConnection()) {
            try (PreparedStatement check = conn.prepareStatement("SELECT to_regclass('flyway_schema_history') IS NOT NULL");
                 ResultSet rs = check.executeQuery()) {
                if (!rs.next() || !rs.getBoolean(1)) return;
            }
            try (PreparedStatement ps = conn.prepareStatement("""
                    DELETE FROM flyway_schema_history
                    WHERE version = '41'
                      AND description = 'achievement system'
                      AND success = FALSE
                    """)) {
                int removed = ps.executeUpdate();
                if (removed > 0) {
                    log.warn("[Flyway] Đã xóa {} dòng lịch sử lỗi của V41 (achievement system) để chạy lại migration.", removed);
                }
            }
        } catch (SQLException e) {
            throw new IllegalStateException("Không dọn được lịch sử Flyway lỗi của V41", e);
        }
    }

    /**
     * Dọn lịch sử Flyway của các migration đã bị ĐỔI SỐ PHIÊN BẢN trên các nhánh feature.
     *
     * <p>─── Vì sao cần? ───
     * <p>Trước đây các nhánh feature (settlement batch, payment expiry) tạo migration với số
     * version tạm (V41 = settlement batch scope, V42 = payment expiry index). Sau khi merge vào
     * {@code main}, số version bị đánh lại cho khớp với các migration đã có trên main:
     * <pre>
     *   DB cũ (đã chạy)              →  Mã nguồn hiện tại (main)
     *   V41 settlement batch scope   → V43 settlement batch scope
     *   V42 payment expiry index     → V44 payment expiry index
     *   V43 ai knowledge documents   → V47 ai knowledge documents
     *   V44 ai chat human handoff    → V48 ai chat human handoff
     *   V47 refund personal 3 bậc    → V50 refund personal 3 bậc
     *   V48 refund personal mô tả    → V51 refund personal mô tả
     *   V49 settlement ten day cycle → V52 settlement ten day cycle
     *   V50 settlement strict period → V53 settlement strict period
     *   V51 settlement cleanup       → V54 settlement cleanup
     *   V41 achievement system       → V41 achievement system   (mới)
     *   V42 guest type pricing       → V42 guest type pricing   (mới)
     * </pre>
     * ⇒ Flyway validate fail: "Migration checksum mismatch for migration version 41 / 42 / 43 / 44"
     * ⇒ {@code flywayInitializer} chết ⇒ {@code entityManagerFactory} không tạo được ⇒
     * ứng dụng không khởi động được ("Unable to start embedded Tomcat").
     *
     * <p>Cách xử lý: xoá đúng các dòng lịch sử CŨ (khớp cả version lẫn description), để
     * Flyway chạy lại các migration tương ứng với số version MỚI. Các migration này đều
     * idempotent (IF NOT EXISTS / DO $$ ... IF NOT EXISTS) nên chạy lại trên DB đã có bảng vẫn an toàn.
     *
     * <p>DB chưa từng chạy bản cũ: không làm gì.
     */
    private static void forgetStaleRenumberedFeatureMigrations(DataSource dataSource) {
        try (Connection conn = dataSource.getConnection()) {
            try (PreparedStatement check = conn.prepareStatement("SELECT to_regclass('flyway_schema_history') IS NOT NULL");
                 ResultSet rs = check.executeQuery()) {
                if (!rs.next() || !rs.getBoolean(1)) return;
            }
            try (PreparedStatement ps = conn.prepareStatement("""
                    DELETE FROM flyway_schema_history
                    WHERE (version = '41' AND (description = 'settlement batch scope' OR script = 'V41__settlement_batch_scope.sql'))
                       OR (version = '42' AND (description = 'payment expiry index' OR script = 'V42__payment_expiry_index.sql'))
                       OR (version = '43' AND (description = 'ai knowledge documents' OR script = 'V43__ai_knowledge_documents.sql'))
                       OR (version = '44' AND (description = 'ai chat human handoff' OR script = 'V44__ai_chat_human_handoff.sql'))
                       OR (version = '47' AND (description = 'refund personal three tier policy' OR script = 'V47__refund_personal_three_tier_policy.sql'))
                       OR (version = '48' AND (description = 'refund personal short description' OR script = 'V48__refund_personal_short_description.sql'))
                       OR (version = '47' AND (description = 'tour departure info' OR script = 'V47__tour_departure_info.sql'))
                       OR (version = '48' AND (description = 'user preferred language' OR script = 'V48__user_preferred_language.sql'))
                       OR (version = '49' AND (description = 'settlement ten day cycle' OR script = 'V49__settlement_ten_day_cycle.sql'))
                       OR (version = '50' AND (description = 'settlement strict period and recreate' OR script = 'V50__settlement_strict_period_and_recreate.sql'))
                       OR (version = '51' AND (description = 'settlement cleanup rejected details' OR script = 'V51__settlement_cleanup_rejected_details.sql'))
                    """)) {
                int removed = ps.executeUpdate();
                if (removed > 0) {
                    log.warn("[Flyway] Đã xóa {} dòng lịch sử của migration đã đổi số phiên bản "
                            + "(V41 settlement batch scope → V43, V42 payment expiry index → V44, "
                            + "V43 ai knowledge documents → V47, V44 ai chat human handoff → V48, "
                            + "V47 refund personal three tier policy → V50, "
                            + "V48 refund personal short description → V51, "
                            + "V49 settlement ten day cycle → V52, "
                            + "V50 settlement strict period and recreate → V53, "
                            + "V51 settlement cleanup rejected details → V54); "
                            + "chúng sẽ được chạy lại với số mới.", removed);
                }
            }
        } catch (SQLException e) {
            throw new IllegalStateException("Không dọn được lịch sử Flyway của migration đã đổi số phiên bản", e);
        }
    }

    /**
     * DB trống: Hibernate tạo {@code guest_type_configs} theo entity hiện tại — không còn cột
     * {@code always_free} (V42 đã bỏ). Nhưng V34 vẫn INSERT vào cột đó và không được sửa (lệch checksum)
     * ⇒ thêm tạm cột khi V34 chưa chạy; V42 sẽ xoá lại.
     */
    private static void restoreLegacyGuestTypeColumn(DataSource dataSource) {
        try (Connection conn = dataSource.getConnection()) {
            try (PreparedStatement check = conn.prepareStatement("""
                    SELECT to_regclass('guest_type_configs') IS NOT NULL
                       AND (to_regclass('flyway_schema_history') IS NULL
                            OR NOT EXISTS (SELECT 1 FROM flyway_schema_history
                                           WHERE version = '34' AND success = TRUE))
                    """);
                 ResultSet rs = check.executeQuery()) {
                if (!rs.next() || !rs.getBoolean(1)) return;
            }
            try (PreparedStatement ps = conn.prepareStatement(
                    "ALTER TABLE guest_type_configs ADD COLUMN IF NOT EXISTS always_free BOOLEAN NOT NULL DEFAULT FALSE")) {
                ps.execute();
            }
        } catch (SQLException e) {
            throw new IllegalStateException("Không chuẩn bị được bảng guest_type_configs cho V34", e);
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
