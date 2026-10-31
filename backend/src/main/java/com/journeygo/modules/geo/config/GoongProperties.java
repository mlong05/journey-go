package com.journeygo.modules.geo.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * Cấu hình dịch vụ địa chỉ Goong (tìm địa chỉ, lấy địa chỉ từ tọa độ).
 *
 * <p>API key chỉ nằm ở máy chủ (biến môi trường {@code GOONG_API_KEY}); trình duyệt gọi qua
 * {@code /api/v1/geo/**} nên không lộ key.
 */
@Component
@Getter
@Setter
@ConfigurationProperties(prefix = "app.goong")
public class GoongProperties {

    /** API key tạo trên https://account.goong.io. Để trống = tắt tính năng. */
    private String apiKey = "";

    private String baseUrl = "https://rsapi.goong.io/v2";

    private Duration timeout = Duration.ofSeconds(6);

    public boolean isConfigured() {
        return apiKey != null && !apiKey.isBlank();
    }
}
