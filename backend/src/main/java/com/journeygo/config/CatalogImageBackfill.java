package com.journeygo.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.jdbc.core.JdbcTemplate;

import java.util.List;

/**
 * Gán MỘT LẦN ảnh đại diện mặc định cho chủ đề / khu vực đã có (trước khi có cột image_url), để trang chủ app
 * hiện ảnh thay cho biểu tượng. Chỉ điền dòng còn trống ảnh; admin đổi ảnh khác ở trang quản trị thì giữ nguyên.
 *
 * <p>Ảnh là ảnh chụp thật trên Wikimedia Commons, giấy phép cho phép dùng thương mại khi ghi nguồn
 * (lưu ở image_credit, app hiện ở góc ảnh). Khớp theo slug hoặc tên; dòng không khớp quy tắc nào thì để trống
 * và app dùng ảnh bìa của một tour thuộc chủ đề / khu vực đó.
 */
@Slf4j
@Configuration
@RequiredArgsConstructor
public class CatalogImageBackfill {

    private static final String MARKER = "catalog_images_2026_11";
    private static final String COMMONS = "https://upload.wikimedia.org/wikipedia/commons/thumb/";

    /** Một quy tắc: dòng có slug chứa {@code slugPart} hoặc tên chứa {@code namePart} (không phân biệt hoa thường). */
    record Rule(String slugPart, String namePart, String imageUrl, String credit) {}

    static final List<Rule> THEME_RULES = List.of(
            new Rule("lang-nghe", "làng nghề",
                    COMMONS + "a/ac/Bat-Trang-Ceramic-Village1.jpg/960px-Bat-Trang-Ceramic-Village1.jpg",
                    "Gốm Bát Tràng · Steven C. Price · CC BY-SA 4.0 · Wikimedia Commons"),
            new Rule("am-thuc", "ẩm thực",
                    COMMONS + "5/5d/Pho_Vietnamese_noodle_soup_in_Ho_Chi_Minh_City%2C_Vietnam.jpg/960px-Pho_Vietnamese_noodle_soup_in_Ho_Chi_Minh_City%2C_Vietnam.jpg",
                    "Phở · Vyacheslav Argenberg · CC BY 4.0 · Wikimedia Commons"),
            new Rule("tam-linh", "tâm linh",
                    COMMONS + "e/e7/Hue_Vietnam_Thien-Mu-Temple-and-Pagoda-01.jpg/960px-Hue_Vietnam_Thien-Mu-Temple-and-Pagoda-01.jpg",
                    "Chùa Thiên Mụ · CEphoto, Uwe Aranas · CC BY-SA 3.0 · Wikimedia Commons"),
            new Rule("le-hoi", "lễ hội",
                    COMMONS + "b/be/Lanterns_in_Hoi_An_3.jpg/960px-Lanterns_in_Hoi_An_3.jpg",
                    "Đèn lồng Hội An · Christophe95 · CC BY-SA 4.0 · Wikimedia Commons"),
            new Rule("di-san", "di sản",
                    COMMONS + "5/52/Hu%E1%BA%BF_%282024%29_-_Meridian_Gate_-_Ng%E1%BB%8D_M%C3%B4n_%28Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF%29_-_img_02.jpg/960px-Hu%E1%BA%BF_%282024%29_-_Meridian_Gate_-_Ng%E1%BB%8D_M%C3%B4n_%28Ho%C3%A0ng_th%C3%A0nh_Hu%E1%BA%BF%29_-_img_02.jpg",
                    "Ngọ Môn, Huế · Chainwit. · CC BY 4.0 · Wikimedia Commons")
    );

    /** Thứ tự quan trọng: "tây nam bộ" phải khớp trước "nam bộ", "tây bắc" trước "miền bắc". */
    static final List<Rule> REGION_RULES = List.of(
            new Rule("tay-bac", "tây bắc",
                    COMMONS + "a/a1/Rice_terraces_in_Sa_Pa_03.jpg/960px-Rice_terraces_in_Sa_Pa_03.jpg",
                    "Ruộng bậc thang Sa Pa · Christophe95 · CC BY-SA 4.0 · Wikimedia Commons"),
            new Rule("bac", "bắc",
                    COMMONS + "2/2d/Halong_Bay_in_Vietnam.jpg/960px-Halong_Bay_in_Vietnam.jpg",
                    "Vịnh Hạ Long · Thomas Hirsch · CC BY-SA 3.0 · Wikimedia Commons"),
            new Rule("trung", "trung",
                    COMMONS + "b/b0/H%E1%BB%99i_An%2C_Ancient_Town%2C_2020-01_CN-10.jpg/960px-H%E1%BB%99i_An%2C_Ancient_Town%2C_2020-01_CN-10.jpg",
                    "Phố cổ Hội An · Steffen Schmitz · CC BY-SA 4.0 · Wikimedia Commons"),
            // "tây nam" / "miền tây", không dùng "tây" trơn để Tây Nguyên không nhận nhầm ảnh chợ nổi
            new Rule("tay-nam", "tây nam",
                    COMMONS + "f/fb/Cai_Rang_Floating_Market_1.jpg/960px-Cai_Rang_Floating_Market_1.jpg",
                    "Chợ nổi Cái Răng · Christophe95 · CC BY-SA 4.0 · Wikimedia Commons"),
            new Rule("mien-tay", "miền tây",
                    COMMONS + "f/fb/Cai_Rang_Floating_Market_1.jpg/960px-Cai_Rang_Floating_Market_1.jpg",
                    "Chợ nổi Cái Răng · Christophe95 · CC BY-SA 4.0 · Wikimedia Commons"),
            new Rule("cuu-long", "cửu long",
                    COMMONS + "f/fb/Cai_Rang_Floating_Market_1.jpg/960px-Cai_Rang_Floating_Market_1.jpg",
                    "Chợ nổi Cái Răng · Christophe95 · CC BY-SA 4.0 · Wikimedia Commons"),
            new Rule("nam", "nam",
                    COMMONS + "6/62/Ho_Chi_Minh_City%2C_Notre-Dame_Basilica%2C_2020-01_CN-01.jpg/960px-Ho_Chi_Minh_City%2C_Notre-Dame_Basilica%2C_2020-01_CN-01.jpg",
                    "Nhà thờ Đức Bà, Sài Gòn · Steffen Schmitz · CC BY-SA 4.0 · Wikimedia Commons")
    );

    private final JdbcTemplate jdbcTemplate;

    @Bean
    public CommandLineRunner backfillCatalogImages() {
        return args -> {
            if (!columnExists("themes", "image_url") || !columnExists("regions", "image_url")) {
                return;
            }
            jdbcTemplate.execute("""
                    CREATE TABLE IF NOT EXISTS data_migration_marker (
                        name VARCHAR(100) PRIMARY KEY,
                        applied_at TIMESTAMP NOT NULL DEFAULT now()
                    )
                    """);
            Integer done = jdbcTemplate.queryForObject(
                    "SELECT COUNT(*) FROM data_migration_marker WHERE name = ?", Integer.class, MARKER);
            if (done != null && done > 0) {
                return;
            }
            int themes = apply("themes", THEME_RULES);
            int regions = apply("regions", REGION_RULES);
            jdbcTemplate.update("INSERT INTO data_migration_marker (name) VALUES (?)", MARKER);
            log.info("[Migration] Đã gán ảnh mặc định cho {} chủ đề và {} khu vực.", themes, regions);
        };
    }

    /** Áp lần lượt từng quy tắc; dòng đã có ảnh (kể cả vừa được quy tắc trước gán) không bị ghi đè. */
    private int apply(String table, List<Rule> rules) {
        int total = 0;
        for (Rule rule : rules) {
            total += jdbcTemplate.update(
                    "UPDATE " + table + " SET image_url = ?, image_credit = ? "
                            + "WHERE image_url IS NULL AND deleted = false "
                            + "AND (lower(slug) LIKE ? OR lower(name) LIKE ?)",
                    rule.imageUrl(), rule.credit(), "%" + rule.slugPart() + "%", "%" + rule.namePart() + "%");
        }
        return total;
    }

    private boolean columnExists(String tableName, String columnName) {
        Integer count = jdbcTemplate.queryForObject(
                """
                SELECT COUNT(*) FROM information_schema.columns
                WHERE table_schema = current_schema() AND table_name = ? AND column_name = ?
                """,
                Integer.class, tableName, columnName);
        return count != null && count > 0;
    }
}
