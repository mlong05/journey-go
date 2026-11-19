package com.journeygo.config.seeder;

import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Java Seed Runner — điểm khởi chạy duy nhất cho toàn bộ dữ liệu DEMO.
 *
 * <p><b>Vai trò:</b> đọc các file SQL trong {@code classpath:seed/} rồi thực thi chúng theo
 * đúng thứ tự tên file (tiền tố số {@code 01_}, {@code 02_}… quyết định thứ tự).
 *
 * <p><b>KHÔNG tự chạy khi Backend khởi động.</b> Runner chỉ hoạt động khi bật cờ
 * {@code app.seed.enabled=true} (biến môi trường {@code SEED_ENABLED=true}) — tức là
 * chạy thủ công, có chủ đích:
 * <ul>
 *   <li>Local: {@code SEED_ENABLED=true mvn spring-boot:run}</li>
 *   <li>Docker: {@code docker compose run --rm backend-seed}</li>
 * </ul>
 *
 * <p>Việc chạy seeder KHÔNG đụng tới dữ liệu nền tảng cố định (Roles, TaskTypes,
 * PointRules, Regions, Themes, chính sách hoa hồng) — những phần đó do
 * {@link com.journeygo.config.DataInitializer} đảm bảo khi ứng dụng khởi động.
 *
 * <p>Mỗi script được bọc trong 1 transaction riêng: một script lỗi ⇒ script đó rollback,
 * các script trước vẫn giữ kết quả. Xem {@link SeedScript} để biết danh sách script và
 * thứ tự chạy.
 */
@Slf4j
@Component
@Order(100)
@ConditionalOnProperty(prefix = "app.seed", name = "enabled", havingValue = "true")
public class SeedRunner {

    private final SeedScriptExecutor executor;
    private final SeedProperties properties;

    public SeedRunner(SeedScriptExecutor executor, SeedProperties properties) {
        this.executor = executor;
        this.properties = properties;
    }

    /**
     * Chạy seeder sau khi ứng dụng đã sẵn sàng (sau khi Flyway + Hibernate tạo/cập nhật
     * schema và DataInitializer đã bảo đảm dữ liệu nền tảng).
     */
    @EventListener(ApplicationReadyEvent.class)
    public void runSeeds() {
        List<SeedScript> scripts = executor.discoverScripts();
        log.info("╔══════════════════════════════════════════════════════════════════╗");
        log.info("║  SEED RUNNER — chạy {} script dữ liệu demo từ classpath:seed/    ║", scripts.size());
        log.info("╚══════════════════════════════════════════════════════════════════╝");

        int succeeded = 0;
        int failed = 0;
        for (SeedScript script : scripts) {
            long startedAt = System.currentTimeMillis();
            try {
                executor.execute(script);
                succeeded++;
                log.info("[Seed] ✔ {} hoàn tất ({} ms)", script.filename(),
                        System.currentTimeMillis() - startedAt);
            } catch (RuntimeException e) {
                failed++;
                log.error("[Seed] ✘ {} thất bại: {}", script.filename(), e.getMessage(), e);
            }
        }

        log.info("[Seed] Kết thúc: {} thành công, {} thất bại.", succeeded, failed);
        if (failed > 0) {
            log.warn("[Seed] CÓ {} script bị lỗi — kiểm tra log ở trên để biết script nào lỗi.", failed);
        }

        // Service `backend-seed` trong Docker Compose: seed xong thì thoát container.
        if (properties.isExitAfterRun()) {
            log.info("[Seed] Thoát ứng dụng sau khi seed (exit-after-run).");
            System.exit(failed > 0 ? 1 : 0);
        }
    }
}
