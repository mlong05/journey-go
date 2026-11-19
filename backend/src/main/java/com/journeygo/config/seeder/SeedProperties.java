package com.journeygo.config.seeder;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

/**
 * Cấu hình cho Java Seed Runner.
 *
 * <p>Mặc định {@code enabled = false} ⇒ seeder KHÔNG chạy khi Backend khởi động.
 * Bật bằng {@code SEED_ENABLED=true} (hoặc {@code --app.seed.enabled=true}).
 */
@Getter
@Setter
@Component
@ConfigurationProperties(prefix = "app.seed")
public class SeedProperties {

    /**
     * Bật/tắt Seed Runner.
     *
     * <p>{@code false} (mặc định): dữ liệu demo KHÔNG được seed khi khởi động.
     * {@code true}: chạy toàn bộ script trong {@code classpath:seed/} theo thứ tự tên file.
     */
    private boolean enabled = false;

    /** Đường dẫn classpath chứa các file SQL seed. */
    private String location = SeedScriptExecutor.DEFAULT_LOCATION;

    /**
     * Thoát ứng dụng ngay sau khi seed xong.
     *
     * <p>{@code true} ⇒ dùng cho service {@code backend-seed} trong Docker Compose: container
     * chạy seeder rồi thoát (exit code 0) thay vì giữ web server sống.
     *
     * <p>{@code false} (mặc định) ⇒ chạy seeder rồi ứng dụng tiếp tục phục vụ (tiện khi
     * chạy {@code SEED_ENABLED=true mvn spring-boot:run} ở local).
     */
    private boolean exitAfterRun = false;
}
