package com.journeygo.config;

import com.journeygo.modules.aiguide.config.GeminiAiProperties;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;

/**
 * Hợp đồng cấu hình AI ở PROFILE PROD.
 *
 * <p><b>Vì sao cần test này?</b>
 * {@code application-prod.yml} là file RIÊNG cho production (profile {@code prod}).
 * Nếu nó THIẾU khối {@code journeygo.ai} mà {@code application.yml} (default) có, thì
 * biến môi trường {@code GEMINI_API_KEY} có truyền vào container cũng VÔ DỤNG — Spring
 * không biết phải bind nó vào {@code journeygo.ai.api-key}.
 *
 * <p>Hậu quả trên production: AI trả lỗi "Chưa cấu hình GEMINI_API_KEY" cho dù
 * Admin ĐÃ đặt đúng biến trong {@code .env}.
 *
 * <p>⇒ Test này nạp profile {@code prod} thật và kiểm tra khóa AI có bind đúng không.
 */
@SpringBootTest(
    classes = GeminiAiProperties.class,
    webEnvironment = SpringBootTest.WebEnvironment.NONE,
    properties = {
        // Giả lập biến môi trường production (docker-compose truyền vào container).
        "GEMINI_API_KEY=test-gemini-key",
        "GEMINI_BASE_URL=https://generativelanguage.googleapis.com/v1beta",
        "GEMINI_EMBEDDING_MODEL=gemini-embedding-001",
        "GEMINI_CHAT_MODEL=gemini-3.5-flash-lite"
    }
)
@EnableConfigurationProperties
@ActiveProfiles("prod")
class AiProdConfigBindingTest {

    @Autowired
    private GeminiAiProperties properties;

    @Test
    @DisplayName("Prod: GEMINI_API_KEY bind vào journeygo.ai.api-key (AI không báo thiếu key)")
    void prodProfile_bindsGeminiApiKey() {
        assertNotNull(properties, "GeminiAiProperties phải được tạo bean");
        assertNotNull(properties.getApiKey(),
                "Prod: journeygo.ai.api-key phải nhận giá trị từ GEMINI_API_KEY");
        assertFalse(properties.getApiKey().isBlank(),
                "Prod: GEMINI_API_KEY KHÔNG được rỗng — AI sẽ báo 'thiếu API KEY'");
        assertEquals("test-gemini-key", properties.getApiKey());
    }

    @Test
    @DisplayName("Prod: các thông số AI còn lại bind đầy đủ")
    void prodProfile_bindsRemainingAiSettings() {
        assertNotNull(properties.getBaseUrl(), "journeygo.ai.base-url phải có giá trị");
        assertTrue(properties.getBaseUrl().startsWith("https://"),
                "Base URL phải là https: " + properties.getBaseUrl());
        assertNotNull(properties.getEmbeddingModel(), "journeygo.ai.embedding-model phải có giá trị");
        assertNotNull(properties.getChatModel(), "journeygo.ai.chat-model phải có giá trị");
        assertTrue(properties.getChunkSize() > 0, "chunk-size phải > 0");
        assertTrue(properties.getTopK() > 0, "top-k phải > 0");
    }

    @Test
    @DisplayName("Prod: file application-prod.yml phải tự khai báo khối journeygo.ai")
    void prodYmlDeclaresAiBlockExplicitly() throws Exception {
        // Đọc TRỰC TIẾP file prod để chặn hồi quy: nếu ai đó xoá khối `journeygo.ai`
        // khỏi application-prod.yml, file prod sẽ mất tự tính (self-contained) và
        // dễ phụ thuộc hành vi merge của Spring — dễ vỡ khi đổi cấu trúc file.
        String yml;
        try (java.io.InputStream in = getClass()
                .getClassLoader()
                .getResourceAsStream("application-prod.yml")) {
            assertNotNull(in, "Không tìm thấy application-prod.yml trên classpath");
            yml = new String(in.readAllBytes(), java.nio.charset.StandardCharsets.UTF_8);
        }

        assertTrue(yml.contains("journeygo:"),
                "application-prod.yml phải có khối `journeygo:`");
        assertTrue(yml.contains("GEMINI_API_KEY"),
                "application-prod.yml phải bind GEMINI_API_KEY");
        assertTrue(yml.contains("GEMINI_CHAT_MODEL"),
                "application-prod.yml phải bind GEMINI_CHAT_MODEL");
        assertTrue(yml.contains("GEMINI_EMBEDDING_MODEL"),
                "application-prod.yml phải bind GEMINI_EMBEDDING_MODEL");
    }
}
