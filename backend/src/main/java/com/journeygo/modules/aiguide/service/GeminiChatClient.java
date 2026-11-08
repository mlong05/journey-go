package com.journeygo.modules.aiguide.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.aiguide.config.GeminiAiProperties;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientResponseException;

import java.util.List;

/**
 * Client kết nối Google Gemini REST API (model gemini-1.5-flash / gemini-2.0-flash / gemini-2.5-flash)
 * để sinh câu trả lời cho tính năng AI Virtual Guide.
 */
@Service
@Slf4j
public class GeminiChatClient {

    private final GeminiAiProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GeminiChatClient(GeminiAiProperties properties,
                            @org.springframework.beans.factory.annotation.Qualifier("geminiRestClientBuilder") RestClient.Builder restClientBuilder,
                            ObjectMapper objectMapper) {
        this.properties = properties;
        this.restClient = restClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    /**
     * DTO đại diện cho một lượt chat trong lịch sử
     */
    public record ChatTurn(String role, String text) {}

    /**
     * Gọi Gemini API sinh phản hồi với system instruction, lịch sử chat và cấu hình generation.
     *
     * @param systemInstruction Chỉ thị hệ thống định hình phong cách, vai trò và guardrails
     * @param history           Lịch sử các lượt chat gần nhất (USER / MODEL)
     * @param prompt            Câu hỏi hiện tại của người dùng kèm ngữ cảnh RAG
     * @param temperature       Độ sáng tạo (0.0 - 1.0, khuyến nghị 0.2 - 0.4 cho factual RAG)
     * @param maxTokens         Giới hạn token phản hồi
     * @return Nội dung phản hồi dạng chuỗi văn bản
     */
    public String generateReply(String systemInstruction,
                                List<ChatTurn> history,
                                String prompt,
                                Double temperature,
                                Integer maxTokens) {
        if (!StringUtils.hasText(prompt)) {
            return "";
        }

        // Chế độ mock khi chưa có key hoặc chạy test
        if ("mock".equalsIgnoreCase(properties.getApiKey()) || "test".equalsIgnoreCase(properties.getApiKey())) {
            log.warn("Gemini API Key đang để chế độ MOCK. Trả về phản hồi giả lập cho Virtual Guide.");
            return generateMockReply(prompt);
        }

        validateApiKey();

        String url = String.format("%s/models/%s:generateContent?key=%s",
                properties.getBaseUrl(),
                properties.getChatModel(),
                properties.getApiKey());

        try {
            ObjectNode root = objectMapper.createObjectNode();

            // 1. System Instruction
            if (StringUtils.hasText(systemInstruction)) {
                ObjectNode sysNode = root.putObject("systemInstruction");
                ArrayNode partsNode = sysNode.putArray("parts");
                partsNode.addObject().put("text", systemInstruction);
            }

            // 2. Contents (History + Current Prompt)
            ArrayNode contentsNode = root.putArray("contents");

            if (history != null) {
                for (ChatTurn turn : history) {
                    if (turn != null && StringUtils.hasText(turn.text())) {
                        ObjectNode turnNode = contentsNode.addObject();
                        // Google Gemini chấp nhận 'user' và 'model'
                        String apiRole = "ASSISTANT".equalsIgnoreCase(turn.role()) || "MODEL".equalsIgnoreCase(turn.role())
                                ? "model"
                                : "user";
                        turnNode.put("role", apiRole);
                        turnNode.putArray("parts").addObject().put("text", turn.text());
                    }
                }
            }

            // Thêm lượt hiện tại của người dùng
            ObjectNode currentTurn = contentsNode.addObject();
            currentTurn.put("role", "user");
            currentTurn.putArray("parts").addObject().put("text", prompt);

            // 3. Generation Config
            ObjectNode genConfig = root.putObject("generationConfig");
            genConfig.put("temperature", temperature != null ? temperature : 0.3);
            genConfig.put("maxOutputTokens", maxTokens != null ? maxTokens : 1024);

            String requestBody = objectMapper.writeValueAsString(root);

            String rawResponse = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody)
                    .retrieve()
                    .body(String.class);

            return parseGeminiResponse(rawResponse);

        } catch (RestClientResponseException e) {
            log.error("Lỗi HTTP khi gọi Gemini GenerateContent API (HTTP {}): {}",
                    e.getStatusCode(), e.getResponseBodyAsString());
            throw new AppException(ErrorCode.AI_CHAT_FAILED,
                    "Không thể kết nối dịch vụ AI: " + e.getStatusCode());
        } catch (AppException e) {
            throw e;
        } catch (Exception e) {
            log.error("Lỗi không xác định khi sinh văn bản từ Gemini API", e);
            throw new AppException(ErrorCode.AI_CHAT_FAILED,
                    "Lỗi xử lý ngôn ngữ AI: " + e.getMessage());
        }
    }

    private String parseGeminiResponse(String rawResponse) {
        try {
            JsonNode root = objectMapper.readTree(rawResponse);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode firstCandidate = candidates.get(0);
                JsonNode parts = firstCandidate.path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    StringBuilder sb = new StringBuilder();
                    for (JsonNode part : parts) {
                        if (part.has("text")) {
                            sb.append(part.get("text").asText());
                        }
                    }
                    return sb.toString().trim();
                }
            }
            log.warn("Gemini API trả về candidates rỗng: {}", rawResponse);
            return "Tôi chưa tìm thấy thông tin phù hợp cho câu hỏi của bạn.";
        } catch (Exception e) {
            log.error("Lỗi giải mã JSON phản hồi từ Gemini: {}", rawResponse, e);
            throw new AppException(ErrorCode.AI_CHAT_FAILED, "Lỗi phân tích cú pháp dữ liệu AI");
        }
    }

    private void validateApiKey() {
        if (!StringUtils.hasText(properties.getApiKey())) {
            throw new AppException(ErrorCode.AI_SERVICE_UNAVAILABLE,
                    "Chưa cấu hình GEMINI_API_KEY. Vui lòng cung cấp API key trong application.yml hoặc biến môi trường.");
        }
    }

    private String generateMockReply(String prompt) {
        return "Xin chào! Tôi là Hướng dẫn viên du lịch ảo JourneyGo (Mock Response). " +
                "Tôi đã tiếp nhận câu hỏi của bạn: \"" + prompt + "\". Hệ thống đang hoạt động với cấu hình giả lập.";
    }
}
