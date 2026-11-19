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
 * Client kết nối Google Gemini REST API (mặc định gemini-3.5-flash-lite, tương thích gemini-2.5-flash / 3.8-flash)
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
     * @param temperature       Độ sáng tạo (chỉ gửi cho thế hệ trước Gemini 3.x)
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

        String url = String.format("%s/models/%s:generateContent",
                properties.getBaseUrl(),
                properties.getChatModel());

        try {
            ObjectNode root = objectMapper.createObjectNode();

            // 1. System Instruction
            if (StringUtils.hasText(systemInstruction)) {
                ObjectNode sysNode = root.putObject("systemInstruction");
                ArrayNode partsNode = sysNode.putArray("parts");
                partsNode.addObject().put("text", systemInstruction);
            }

            // 2. Contents (History chuẩn hóa luân phiên + Current Prompt)
            ArrayNode contentsNode = root.putArray("contents");
            List<ChatTurn> normalizedTurns = normalizeTurns(history, prompt);
            for (ChatTurn turn : normalizedTurns) {
                ObjectNode turnNode = contentsNode.addObject();
                turnNode.put("role", turn.role());
                turnNode.putArray("parts").addObject().put("text", turn.text());
            }

            // 3. Generation Config (Gemini 3.5+ không cho phép temperature/top_p/top_k)
            ObjectNode genConfig = root.putObject("generationConfig");
            String chatModel = properties.getChatModel();
            boolean isGemini3OrNewer = chatModel != null
                    && chatModel.trim().toLowerCase(java.util.Locale.ROOT).startsWith("gemini-3");
            if (!isGemini3OrNewer && temperature != null) {
                genConfig.put("temperature", temperature);
            }
            genConfig.put("maxOutputTokens", maxTokens != null ? maxTokens : 1024);

            String requestBody = objectMapper.writeValueAsString(root);

            String rawResponse = restClient.post()
                    .uri(url)
                    .header("x-goog-api-key", properties.getApiKey())
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

    /**
     * Chuẩn hóa danh sách lượt chat đảm bảo bắt đầu bằng "user", luân phiên user/model,
     * gộp các lượt trùng vai trò liên tiếp và luôn kết thúc bằng prompt hiện tại ở vai trò "user".
     */
    List<ChatTurn> normalizeTurns(List<ChatTurn> history, String currentPrompt) {
        java.util.List<ChatTurn> normalized = new java.util.ArrayList<>();
        if (history != null) {
            for (ChatTurn turn : history) {
                if (turn == null || !StringUtils.hasText(turn.text())) {
                    continue;
                }
                String apiRole = ("ASSISTANT".equalsIgnoreCase(turn.role()) || "MODEL".equalsIgnoreCase(turn.role()))
                        ? "model"
                        : "user";
                String text = turn.text().trim();
                if (normalized.isEmpty()) {
                    if ("model".equals(apiRole)) {
                        continue; // Bỏ lượt model đứng đầu nếu thiếu lượt mở đầu từ user
                    }
                    normalized.add(new ChatTurn(apiRole, text));
                } else {
                    ChatTurn prev = normalized.get(normalized.size() - 1);
                    if (prev.role().equals(apiRole)) {
                        normalized.set(normalized.size() - 1, new ChatTurn(apiRole, prev.text() + "\n\n" + text));
                    } else {
                        normalized.add(new ChatTurn(apiRole, text));
                    }
                }
            }
        }

        String trimmedPrompt = currentPrompt.trim();
        if (!normalized.isEmpty() && "user".equals(normalized.get(normalized.size() - 1).role())) {
            ChatTurn prev = normalized.get(normalized.size() - 1);
            normalized.set(normalized.size() - 1, new ChatTurn("user", prev.text() + "\n\n" + trimmedPrompt));
        } else {
            normalized.add(new ChatTurn("user", trimmedPrompt));
        }
        return normalized;
    }

    private String parseGeminiResponse(String rawResponse) {
        if (!StringUtils.hasText(rawResponse)) {
            return "Tôi chưa tìm thấy thông tin phù hợp cho câu hỏi của bạn.";
        }
        try {
            JsonNode root = objectMapper.readTree(rawResponse);
            JsonNode candidates = root.path("candidates");
            if (candidates.isArray() && !candidates.isEmpty()) {
                JsonNode firstCandidate = candidates.get(0);
                String finishReason = firstCandidate.path("finishReason").asText("");
                if ("SAFETY".equalsIgnoreCase(finishReason)) {
                    log.warn("Gemini API chặn phản hồi vì SAFETY guardrail");
                    return "Xin lỗi, tôi chưa thể phản hồi nội dung này. Bạn vui lòng đặt câu hỏi khác liên quan đến điểm đến hoặc hành trình nhé!";
                }
                JsonNode parts = firstCandidate.path("content").path("parts");
                if (parts.isArray() && !parts.isEmpty()) {
                    StringBuilder sb = new StringBuilder();
                    for (JsonNode part : parts) {
                        if (part.has("text")) {
                            sb.append(part.get("text").asText());
                        }
                    }
                    String text = sb.toString().trim();
                    if (StringUtils.hasText(text)) {
                        return text;
                    }
                }
            }
            log.warn("Gemini API trả về candidates rỗng hoặc không có text");
            return "Tôi chưa tìm thấy thông tin phù hợp cho câu hỏi của bạn.";
        } catch (Exception e) {
            log.error("Lỗi giải mã JSON phản hồi từ Gemini", e);
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
