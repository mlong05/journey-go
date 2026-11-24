package com.journeygo.modules.aiguide.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.journeygo.modules.aiguide.config.GeminiAiProperties;
import com.journeygo.modules.aiguide.repository.AiKnowledgeChunkStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.client.MockRestServiceServer;
import org.springframework.web.client.RestClient;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.header;
import static org.springframework.test.web.client.match.MockRestRequestMatchers.requestTo;
import static org.springframework.test.web.client.response.MockRestResponseCreators.withSuccess;

class GeminiEmbeddingClientTest {

    private GeminiEmbeddingClient embeddingClient;
    private GeminiAiProperties properties;

    @BeforeEach
    void setUp() {
        properties = new GeminiAiProperties();
        properties.setApiKey("mock");

        embeddingClient = new GeminiEmbeddingClient(
                properties,
                RestClient.builder(),
                new ObjectMapper()
        );
    }

    @Test
    @DisplayName("Mặc định sử dụng gemini-embedding-001")
    void defaultModelIsGeminiEmbedding001() {
        assertThat(new GeminiAiProperties().getEmbeddingModel()).isEqualTo("gemini-embedding-001");
    }

    @Test
    @DisplayName("Chế độ Mock trả về vector đơn vị (L2 norm = 1) có 768 chiều")
    void testEmbed_mockMode_unitVector() {
        float[] vector = embeddingClient.embed("Tháp Rùa Hồ Gươm");

        assertThat(vector).isNotNull().hasSize(768);
        double normSq = 0.0;
        for (float v : vector) {
            normSq += v * v;
        }
        assertThat(Math.sqrt(normSq)).isCloseTo(1.0, within(1e-4));
    }

    @Test
    @DisplayName("Văn bản chung từ khóa có Cosine Similarity cao hơn trong mock mode")
    void testEmbed_mockMode_semanticOverlap() {
        float[] query = embeddingClient.embed("Chùa Một Cột Hà Nội");
        float[] related = embeddingClient.embed("Kiến trúc Chùa Một Cột tại Hà Nội");
        float[] unrelated = embeddingClient.embed("Cố đô Huế sông Hương Trường Tiền");

        double simRelated = AiKnowledgeChunkStore.cosineSimilarity(query, related);
        double simUnrelated = AiKnowledgeChunkStore.cosineSimilarity(query, unrelated);

        assertThat(simRelated).isGreaterThan(simUnrelated);
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

    @Test
    @DisplayName("Gọi API thật truyền x-goog-api-key qua header thay vì URL query string")
    void testEmbed_liveCallSendsApiKeyInHeader() {
        GeminiAiProperties liveProps = new GeminiAiProperties();
        liveProps.setApiKey("real-secret-key");
        liveProps.setBaseUrl("https://generativelanguage.googleapis.com/v1beta");
        liveProps.setEmbeddingModel("gemini-embedding-001");

        RestClient.Builder builder = RestClient.builder();
        MockRestServiceServer server = MockRestServiceServer.bindTo(builder).build();
        GeminiEmbeddingClient liveClient = new GeminiEmbeddingClient(liveProps, builder, new ObjectMapper());

        server.expect(requestTo("https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent"))
                .andExpect(header("x-goog-api-key", "real-secret-key"))
                .andRespond(withSuccess("{\"embedding\":{\"values\":[0.5,0.25]}}", MediaType.APPLICATION_JSON));

        float[] result = liveClient.embed("Lịch sử Chùa Thiên Mụ");

        server.verify();
        assertThat(result).containsExactly(0.5f, 0.25f);
    }
}
