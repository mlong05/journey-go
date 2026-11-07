package com.journeygo.modules.aiguide.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@ConfigurationProperties(prefix = "journeygo.ai")
@Getter
@Setter
public class GeminiAiProperties {

    /**
     * Google Gemini API Key.
     */
    private String apiKey;

    /**
     * Base URL cho Gemini REST API.
     */
    private String baseUrl = "https://generativelanguage.googleapis.com/v1beta";

    /**
     * Tên mô hình Embedding (mặc định text-embedding-004 với 768 chiều).
     */
    private String embeddingModel = "text-embedding-004";

    /**
     * Tên mô hình Chat LLM (mặc định gemini-1.5-flash).
     */
    private String chatModel = "gemini-1.5-flash";

    /**
     * Kích thước đoạn cắt văn bản chuẩn (tính theo số từ, mặc định 400).
     */
    private int chunkSize = 400;

    /**
     * Độ gối giữa 2 đoạn liên tiếp (tính theo số từ, mặc định 50).
     */
    private int chunkOverlap = 50;

    /**
     * Số lượng chunks liên quan nhất cần lấy trong truy vấn RAG (Top K).
     */
    private int topK = 4;
}
