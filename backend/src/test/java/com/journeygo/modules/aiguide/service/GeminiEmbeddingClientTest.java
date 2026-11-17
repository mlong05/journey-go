package com.journeygo.modules.aiguide.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.journeygo.modules.aiguide.config.GeminiAiProperties;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class GeminiEmbeddingClientTest {

    private GeminiEmbeddingClient embeddingClient;
    private GeminiAiProperties properties;

    @BeforeEach
    void setUp() {
        properties = new GeminiAiProperties();
        properties.setApiKey("mock"); // Chế độ Mock cho Unit Test

        embeddingClient = new GeminiEmbeddingClient(
                properties,
                RestClient.builder(),
                new ObjectMapper()
        );
    }

    @Test
    @DisplayName("Chế độ Mock trả về vector 768 chiều")
    void testEmbed_mockMode() {
        float[] vector = embeddingClient.embed("Tháp Rùa Hồ Gươm");

        assertThat(vector).isNotNull();
        assertThat(vector).hasSize(768);
    }

    @Test
    @DisplayName("Batch Embed trả về danh sách vector tương ứng")
    void testEmbedAll_mockMode() {
        List<String> texts = List.of("Đoạn văn 1", "Đoạn văn 2", "Đoạn văn 3");
        List<float[]> vectors = embeddingClient.embedAll(texts);

        assertThat(vectors).hasSize(3);
        assertThat(vectors.get(0)).hasSize(768);
        assertThat(vectors.get(1)).hasSize(768);
        assertThat(vectors.get(2)).hasSize(768);
    }

    @Test
    @DisplayName("Chuyển đổi vector sang định dạng PostgreSQL string: [0.1, -0.2, ...]")
    void testToVectorString() {
        float[] vector = new float[]{0.15f, -0.25f, 0.5f};
        String vectorStr = embeddingClient.toVectorString(vector);

        assertThat(vectorStr).isEqualTo("[0.15,-0.25,0.5]");
    }
}

