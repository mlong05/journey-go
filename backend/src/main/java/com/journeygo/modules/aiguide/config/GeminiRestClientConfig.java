package com.journeygo.modules.aiguide.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;

/**
 * Cấu hình RestClient chuyên dụng cho các API calls đến Google Gemini.
 * Thiết lập timeout để tránh request treo vô tận khi Gemini API phản hồi chậm.
 */
@Configuration
public class GeminiRestClientConfig {

    /** Timeout kết nối TCP (5 giây) */
    private static final int CONNECT_TIMEOUT_MS = 5_000;

    /** Timeout đọc dữ liệu — đủ cho LLM generation (30 giây) */
    private static final int READ_TIMEOUT_MS = 30_000;

    @Bean(name = "geminiRestClientBuilder")
    public RestClient.Builder geminiRestClientBuilder() {
        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(CONNECT_TIMEOUT_MS);
        factory.setReadTimeout(READ_TIMEOUT_MS);

        return RestClient.builder().requestFactory(factory);
    }
}
