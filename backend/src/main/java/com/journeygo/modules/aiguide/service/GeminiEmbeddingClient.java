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

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Service kết nối trực tiếp đến Google Gemini REST API để tính toán vector nhúng (Embedding).
 * Mặc định sử dụng model text-embedding-004 với 768 chiều.
 */
@Service
@Slf4j
public class GeminiEmbeddingClient implements AiEmbeddingService {

    private static final int MAX_BATCH_SIZE = 50;

    private final GeminiAiProperties properties;
    private final RestClient restClient;
    private final ObjectMapper objectMapper;

    public GeminiEmbeddingClient(GeminiAiProperties properties,
                                 RestClient.Builder restClientBuilder,
                                 ObjectMapper objectMapper) {
        this.properties = properties;
        this.restClient = restClientBuilder.build();
        this.objectMapper = objectMapper;
    }

    @Override
    public float[] embed(String text) {
        if (!StringUtils.hasText(text)) {
            return new float[768];
        }

        // Hỗ trợ chế độ mock khi chạy test hoặc local dev chưa có key
        if ("mock".equalsIgnoreCase(properties.getApiKey()) || "test".equalsIgnoreCase(properties.getApiKey())) {
            log.warn("Gemini API Key đang để chế độ MOCK. Trả về vector giả lập 768 chiều.");
            return generateMockVector(text);
        }

        validateApiKey();

        String url = String.format("%s/models/%s:embedContent?key=%s",
                properties.getBaseUrl(),
                properties.getEmbeddingModel(),
                properties.getApiKey());

        ObjectNode requestBody = objectMapper.createObjectNode();
        requestBody.put("model", "models/" + properties.getEmbeddingModel());
        ObjectNode content = requestBody.putObject("content");
        ArrayNode parts = content.putArray("parts");
        parts.addObject().put("text", text);

        try {
            JsonNode response = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody.toString())
                    .retrieve()
                    .body(JsonNode.class);

            if (response == null || !response.has("embedding")) {
                throw new AppException(ErrorCode.AI_EMBEDDING_FAILED, "Phản hồi từ Gemini không chứa dữ liệu embedding");
            }

            JsonNode valuesNode = response.path("embedding").path("values");
            return parseValuesNode(valuesNode);
        } catch (RestClientResponseException ex) {
            log.error("Lỗi gọi Gemini embedContent API [status={}]: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new AppException(ErrorCode.AI_EMBEDDING_FAILED, "Lỗi từ Gemini Embedding API: " + ex.getMessage());
        } catch (Exception ex) {
            log.error("Lỗi không xác định khi tạo embedding từ Gemini", ex);
            throw new AppException(ErrorCode.AI_EMBEDDING_FAILED, "Lỗi tạo embedding: " + ex.getMessage());
        }
    }

    @Override
    public List<float[]> embedAll(List<String> texts) {
        if (texts == null || texts.isEmpty()) {
            return Collections.emptyList();
        }

        if ("mock".equalsIgnoreCase(properties.getApiKey()) || "test".equalsIgnoreCase(properties.getApiKey())) {
            return texts.stream().map(this::generateMockVector).toList();
        }

        validateApiKey();

        List<float[]> allEmbeddings = new ArrayList<>(texts.size());

        // Phân trang batch thành các nhóm tối đa MAX_BATCH_SIZE
        for (int i = 0; i < texts.size(); i += MAX_BATCH_SIZE) {
            int end = Math.min(i + MAX_BATCH_SIZE, texts.size());
            List<String> subList = texts.subList(i, end);
            allEmbeddings.addAll(callBatchEmbedContents(subList));
        }

        return allEmbeddings;
    }

    private List<float[]> callBatchEmbedContents(List<String> texts) {
        String url = String.format("%s/models/%s:batchEmbedContents?key=%s",
                properties.getBaseUrl(),
                properties.getEmbeddingModel(),
                properties.getApiKey());

        ObjectNode requestBody = objectMapper.createObjectNode();
        ArrayNode requestsArray = requestBody.putArray("requests");

        for (String text : texts) {
            ObjectNode item = requestsArray.addObject();
            item.put("model", "models/" + properties.getEmbeddingModel());
            ObjectNode content = item.putObject("content");
            ArrayNode parts = content.putArray("parts");
            parts.addObject().put("text", text != null ? text : "");
        }

        try {
            JsonNode response = restClient.post()
                    .uri(url)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(requestBody.toString())
                    .retrieve()
                    .body(JsonNode.class);

            if (response == null || !response.has("embeddings")) {
                throw new AppException(ErrorCode.AI_EMBEDDING_FAILED, "Phản hồi từ Gemini không chứa mảng embeddings");
            }

            JsonNode embeddingsNode = response.path("embeddings");
            List<float[]> result = new ArrayList<>(embeddingsNode.size());
            for (JsonNode itemNode : embeddingsNode) {
                result.add(parseValuesNode(itemNode.path("values")));
            }
            return result;
        } catch (RestClientResponseException ex) {
            log.error("Lỗi gọi Gemini batchEmbedContents API [status={}]: {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new AppException(ErrorCode.AI_EMBEDDING_FAILED, "Lỗi từ Gemini Batch Embedding API: " + ex.getMessage());
        } catch (Exception ex) {
            log.error("Lỗi không xác định khi batch embedding từ Gemini", ex);
            throw new AppException(ErrorCode.AI_EMBEDDING_FAILED, "Lỗi tạo batch embedding: " + ex.getMessage());
        }
    }

    private float[] parseValuesNode(JsonNode valuesNode) {
        if (!valuesNode.isArray()) {
            return new float[768];
        }
        float[] vector = new float[valuesNode.size()];
        for (int i = 0; i < valuesNode.size(); i++) {
            vector[i] = (float) valuesNode.get(i).asDouble();
        }
        return vector;
    }

    private void validateApiKey() {
        if (!StringUtils.hasText(properties.getApiKey())) {
            log.error("Chưa cấu hình GEMINI_API_KEY trong file .env hoặc biến môi trường.");
            throw new AppException(ErrorCode.AI_SERVICE_UNAVAILABLE, "Gemini API Key chưa được cấu hình trên máy chủ.");
        }
    }

    private float[] generateMockVector(String text) {
        float[] vector = new float[768];
        int hash = text != null ? text.hashCode() : 0;
        for (int i = 0; i < 768; i++) {
            vector[i] = (float) (Math.sin(hash + i) * 0.05);
        }
        return vector;
    }
}

