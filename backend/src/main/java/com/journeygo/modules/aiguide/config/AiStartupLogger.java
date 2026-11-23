package com.journeygo.modules.aiguide.config;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * In & CẢNH BÁO cấu hình AI (Gemini) khi ứng dụng khởi động.
 *
 * <p><b>Vì sao cần?</b>
 * AI Virtual Guide chỉ gặp lỗi "Chưa cấu hình GEMINI_API_KEY" khi NGƯỜI DÙNG
 * mở chat — tức là lỗi hiện ra MUỘN, khó truy nguyên, và dễ bị tưởng là "AI hỏng".
 *
 * <p>⇒ Kiểm tra NGAY LÚC KHỞI ĐỘNG: nếu thiếu key thì log cảnh báo to, nêu rõ
 * cần đặt biến nào ở đâu, để Admin sửa ngay khi deploy chứ không phải lúc khách
 * chat. (Cùng pattern với {@code VnPayStartupLogger}.)
 *
 * <p>KHÔNG in giá trị {@code apiKey} — chỉ in độ dài / trạng thái.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class AiStartupLogger {

    private final GeminiAiProperties properties;

    @EventListener(ApplicationReadyEvent.class)
    public void logConfiguration() {
        String apiKey = properties.getApiKey();

        boolean missing = !StringUtils.hasText(apiKey);
        boolean mock = "mock".equalsIgnoreCase(apiKey) || "test".equalsIgnoreCase(apiKey);

        if (missing) {
            log.warn("""
                    ⚠️ [AI] GEMINI_API_KEY CHƯA ĐƯỢC CẤU HÌNH.
                       AI Virtual Guide (RAG) SẼ KHÔNG HOẠT ĐỘNG — người dùng mở chat
                       sẽ nhận lỗi "Chưa cấu hình GEMINI_API_KEY".
                       Khắc phục: thêm GEMINI_API_KEY=<key> vào file .env ở thư mục gốc
                       rồi restart container backend.
                       Lấy key tại: https://aistudio.google.com/apikey
                    """);
        } else if (mock) {
            log.warn("[AI] GEMINI_API_KEY đang ở chế độ MOCK — trả phản hồi giả lập, KHÔNG gọi Gemini thật.");
        } else {
            log.info("[AI] Cấu hình Gemini: embeddingModel={}, chatModel={}, baseUrl={}, apiKey=<đã cấu hình, {} ký tự>",
                    properties.getEmbeddingModel(),
                    properties.getChatModel(),
                    properties.getBaseUrl(),
                    apiKey.length());
        }

        log.info("[AI] RAG: chunkSize={}, chunkOverlap={}, topK={}",
                properties.getChunkSize(), properties.getChunkOverlap(), properties.getTopK());

        log.info("[AI] Guard: rateLimitPerMinute={}, maxQuestionLength={}",
                properties.getRateLimitPerMinute(), properties.getMaxQuestionLength());
    }
}
