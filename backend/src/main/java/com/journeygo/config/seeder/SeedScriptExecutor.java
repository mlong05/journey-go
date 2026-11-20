package com.journeygo.config.seeder;

import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.core.io.support.ResourcePatternResolver;
import org.springframework.stereotype.Component;

import javax.sql.DataSource;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/**
 * Thực thi các file SQL seed trong {@code classpath:seed/}.
 *
 * <p><b>Vì sao không dùng {@code ScriptUtils} của Spring?</b>
 * ScriptUtils tách câu lệnh theo dấu {@code ;} và KHÔNG hiểu cú pháp
 * {@code DO $tag$ ... $tag$} của PostgreSQL — phần lớn script seed dùng đúng cú pháp này
 * để gom nhiều lệnh vào 1 khối có xử lý lỗi (BEGIN/EXCEPTION). Vì vậy bộ tách câu lệnh
 * được viết riêng tại {@link #splitStatements(String)} — hiểu:
 * <ul>
 *   <li>chuỗi {@code '...'} (escape bằng {@code ''})</li>
 *   <li>identifier {@code "..."} (escape bằng {@code ""})</li>
 *   <li>khối dollar-quoted {@code $$...$$} / {@code $tag$...$tag$}</li>
 *   <li>comment dòng {@code --} và comment khối</li>
 * </ul>
 *
 * <p>Mỗi script chạy trong 1 transaction riêng: script lỗi ⇒ rollback script đó, các
 * script trước vẫn giữ nguyên kết quả.
 */
@Slf4j
@Component
public class SeedScriptExecutor {

    /** Thư mục chứa các file SQL seed trong classpath. */
    public static final String DEFAULT_LOCATION = "classpath*:seed/*.sql";

    private final DataSource dataSource;
    private final SeedProperties properties;

    public SeedScriptExecutor(DataSource dataSource, SeedProperties properties) {
        this.dataSource = dataSource;
        this.properties = properties;
    }

    /**
     * Quét classpath và trả về danh sách script đã sắp xếp theo tiền tố số.
     *
     * <p>Tiền tố số quyết định thứ tự chạy: {@code 01_demo_accounts.sql} chạy trước
     * {@code 05_demo_settlement_2026.sql}. File không có tiền tố số được xếp cuối
     * (theo tên) để không chen ngang vào chuỗi thứ tự chính.
     */
    public List<SeedScript> discoverScripts() {
        List<SeedScript> scripts = new ArrayList<>();
        ResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
        try {
            Resource[] resources = resolver.getResources(properties.getLocation());
            for (Resource resource : resources) {
                String filename = resource.getFilename();
                if (filename == null || !filename.toLowerCase().endsWith(".sql")) {
                    continue;
                }
                scripts.add(new SeedScript(filename, parseOrder(filename), resource));
            }
        } catch (IOException e) {
            throw new IllegalStateException("Không quét được thư mục seed: " + properties.getLocation(), e);
        }

        scripts.sort(Comparator.comparingInt(SeedScript::order).thenComparing(SeedScript::filename));
        return scripts;
    }

    /** Số thứ tự trong tên file — phần số đầu tiên trước dấu {@code _}. */
    private int parseOrder(String filename) {
        String name = filename.endsWith(".sql")
                ? filename.substring(0, filename.length() - 4)
                : filename;
        int dash = name.indexOf('_');
        String prefix = dash > 0 ? name.substring(0, dash) : name;
        try {
            return Integer.parseInt(prefix);
        } catch (NumberFormatException e) {
            // File không có tiền tố số ⇒ xếp sau các script có tiền tố số.
            return Integer.MAX_VALUE;
        }
    }

    /**
     * Chạy một script trong 1 transaction.
     *
     * @throws RuntimeException nếu script lỗi (đã rollback)
     */
    public void execute(SeedScript script) {
        String sql = readContent(script.resource());
        List<String> statements = splitStatements(sql);
        log.info("[Seed] ▶ {} — {} câu lệnh", script.filename(), statements.size());

        try (Connection connection = dataSource.getConnection()) {
            boolean previousAutoCommit = connection.getAutoCommit();
            connection.setAutoCommit(false);
            try {
                try (Statement statement = connection.createStatement()) {
                    for (String sqlStatement : statements) {
                        statement.execute(sqlStatement);
                    }
                }
                connection.commit();
            } catch (SQLException e) {
                connection.rollback();
                throw new IllegalStateException(
                        "Script " + script.filename() + " thất bại: " + e.getMessage(), e);
            } finally {
                connection.setAutoCommit(previousAutoCommit);
            }
        } catch (SQLException e) {
            throw new IllegalStateException("Không mở được kết nối DB cho seed: " + e.getMessage(), e);
        }
    }

    /** Đọc nội dung file script (UTF-8, bỏ BOM nếu có). */
    private String readContent(Resource resource) {
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            StringBuilder builder = new StringBuilder();
            String line;
            boolean first = true;
            while ((line = reader.readLine()) != null) {
                if (first) {
                    // Một số file SQL lưu kèm BOM (U+FEFF) — PostgreSQL không chấp nhận.
                    if (!line.isEmpty() && line.charAt(0) == '\uFEFF') {
                        line = line.substring(1);
                    }
                    first = false;
                }
                builder.append(line).append('\n');
            }
            return builder.toString();
        } catch (IOException e) {
            throw new IllegalStateException("Không đọc được file seed: " + resource.getFilename(), e);
        }
    }

    /**
     * Tách script SQL thành từng câu lệnh, hiểu cú pháp PostgreSQL.
     *
     * <p>Bỏ qua các lệnh meta của psql (dòng bắt đầu bằng {@code \}) vì JDBC không hiểu.
     */
    static List<String> splitStatements(String sql) {
        List<String> statements = new ArrayList<>();
        StringBuilder current = new StringBuilder();
        int i = 0;
        int n = sql.length();

        while (i < n) {
            char c = sql.charAt(i);

            // ── Comment dòng ──────────────────────────────────────────────────
            if (c == '-' && i + 1 < n && sql.charAt(i + 1) == '-') {
                while (i < n && sql.charAt(i) != '\n') {
                    i++;
                }
                continue;
            }

            // ── Comment khối ──────────────────────────────────────────────────
            if (c == '/' && i + 1 < n && sql.charAt(i + 1) == '*') {
                int end = sql.indexOf("*/", i + 2);
                i = (end < 0) ? n : end + 2;
                continue;
            }

            // ── Lệnh meta của psql (\set, \echo, …) ──────────────────────────
            if (c == '\\' && current.toString().isBlank()) {
                while (i < n && sql.charAt(i) != '\n') {
                    i++;
                }
                continue;
            }

            // ── Chuỗi '...' ──────────────────────────────────────────────────
            if (c == '\'') {
                int end = skipQuoted(sql, i, '\'');
                current.append(sql, i, end);
                i = end;
                continue;
            }

            // ── Identifier "..." ─────────────────────────────────────────────
            if (c == '"') {
                int end = skipQuoted(sql, i, '"');
                current.append(sql, i, end);
                i = end;
                continue;
            }

            // ── Khối dollar-quoted $tag$...$tag$ ────────────────────────────
            if (c == '$') {
                int tagEnd = dollarTagEnd(sql, i);
                if (tagEnd > 0) {
                    String tag = sql.substring(i, tagEnd);
                    int close = sql.indexOf(tag, tagEnd);
                    int end = (close < 0) ? n : close + tag.length();
                    current.append(sql, i, end);
                    i = end;
                    continue;
                }
            }

            // ── Dấu phân cách câu lệnh ──────────────────────────────────────
            if (c == ';') {
                addStatement(statements, current);
                current.setLength(0);
                i++;
                continue;
            }

            current.append(c);
            i++;
        }

        addStatement(statements, current);
        return statements;
    }

    /**
     * Trả về chỉ số ngay sau khối đóng của chuỗi/identifier bắt đầu tại {@code start}.
     *
     * <p>Escape bằng cách lặp lại ký tự trích dẫn (chuỗi trong SQL chuẩn):
     * {@code 'it''s'} và {@code "a""b"}.
     */
    private static int skipQuoted(String sql, int start, char quote) {
        int i = start + 1;
        int n = sql.length();
        while (i < n) {
            if (sql.charAt(i) == quote) {
                if (i + 1 < n && sql.charAt(i + 1) == quote) {
                    i += 2;
                    continue;
                }
                return i + 1;
            }
            i++;
        }
        return n;
    }

    /**
     * Nếu tại {@code start} bắt đầu một khối dollar-quoted ({@code $$} hoặc {@code $tag$}),
     * trả về chỉ số kết thúc của thẻ mở; ngược lại trả {@code -1}.
     */
    private static int dollarTagEnd(String sql, int start) {
        int i = start + 1;
        int n = sql.length();
        if (i < n && sql.charAt(i) == '$') {
            return i + 1; // $$
        }
        while (i < n && (Character.isLetterOrDigit(sql.charAt(i)) || sql.charAt(i) == '_')) {
            i++;
        }
        if (i > start + 1 && i < n && sql.charAt(i) == '$') {
            return i + 1;
        }
        return -1;
    }

    /** Thêm câu lệnh vào danh sách nếu không rỗng. */
    private static void addStatement(List<String> statements, StringBuilder current) {
        String statement = current.toString().trim();
        if (!statement.isEmpty()) {
            statements.add(statement);
        }
    }
}
