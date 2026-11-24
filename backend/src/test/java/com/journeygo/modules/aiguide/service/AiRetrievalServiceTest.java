package com.journeygo.modules.aiguide.service;

import com.journeygo.modules.aiguide.config.GeminiAiProperties;
import com.journeygo.modules.aiguide.entity.AiKnowledgeChunk;
import com.journeygo.modules.aiguide.repository.AiKnowledgeChunkStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.within;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiRetrievalServiceTest {

    @Mock
    private AiEmbeddingService embeddingService;

    @Mock
    private AiKnowledgeChunkStore chunkStore;

    @Spy
    private GeminiAiProperties properties = new GeminiAiProperties();

    @InjectMocks
    private AiRetrievalService retrievalService;

    @BeforeEach
    void setUp() {
        properties.setTopK(4);
    }

    @Test
    @DisplayName("Normal Guide Mode gọi tìm kiếm gộp theo destinationId và tri thức GLOBAL")
    void normalGuideMode_searchesByDestinationIncludingGlobal() {
        float[] vec = new float[]{1.0f, 0.0f};
        AiKnowledgeChunk c1 = AiKnowledgeChunk.builder().id(UUID.randomUUID()).sourceId("S1").build();

        when(embeddingService.embed("Chùa xây năm nào?")).thenReturn(vec);
        when(embeddingService.toVectorString(vec)).thenReturn("[1.0,0.0]");
        when(chunkStore.searchSimilar(50L, true, null, vec, "[1.0,0.0]", 4)).thenReturn(List.of(c1));

        List<AiKnowledgeChunk> results = retrievalService.retrieveRelevantChunks("Chùa xây năm nào?", 50L, false);

        assertThat(results).containsExactly(c1);
        verify(chunkStore).searchSimilar(50L, true, null, vec, "[1.0,0.0]", 4);
    }

    @Test
    @DisplayName("Normal Guide Mode với destinationId == null tìm toàn bộ kho tri thức (gồm GLOBAL)")
    void normalGuideMode_nullDestination_searchesAll() {
        float[] vec = new float[]{1.0f, 0.0f};
        AiKnowledgeChunk policyChunk = AiKnowledgeChunk.builder().id(UUID.randomUUID()).sourceId("ADMIN_DOC:1").destinationId(null).build();

        when(embeddingService.embed("Chính sách hoàn tiền?")).thenReturn(vec);
        when(embeddingService.toVectorString(vec)).thenReturn("[1.0,0.0]");
        when(chunkStore.searchSimilar(null, null, vec, "[1.0,0.0]", 4)).thenReturn(List.of(policyChunk));

        List<AiKnowledgeChunk> results = retrievalService.retrieveRelevantChunks("Chính sách hoàn tiền?", null, false);

        assertThat(results).containsExactly(policyChunk);
        verify(chunkStore).searchSimilar(null, null, vec, "[1.0,0.0]", 4);
    }

    @Test
    @DisplayName("Task Hint Mode ưu tiên TASK_HINT và bổ sung chunk chung cùng điểm đến nếu thiếu")
    void taskHintMode_supplementsFromSameDestination() {
        float[] vec = new float[]{0.5f, 0.5f};
        UUID hintId = UUID.randomUUID();
        UUID generalId = UUID.randomUUID();

        AiKnowledgeChunk hintChunk = AiKnowledgeChunk.builder().id(hintId).contentType("TASK_HINT").build();
        AiKnowledgeChunk generalChunk = AiKnowledgeChunk.builder().id(generalId).contentType("CULTURAL_STORY").build();

        when(embeddingService.embed("Gợi ý giúp tôi")).thenReturn(vec);
        when(embeddingService.toVectorString(vec)).thenReturn("[0.5,0.5]");
        when(chunkStore.searchSimilar(50L, "TASK_HINT", vec, "[0.5,0.5]", 4)).thenReturn(List.of(hintChunk));
        when(chunkStore.searchSimilar(50L, null, vec, "[0.5,0.5]", 4)).thenReturn(List.of(hintChunk, generalChunk));

        List<AiKnowledgeChunk> results = retrievalService.retrieveRelevantChunks("Gợi ý giúp tôi", 50L, true);

        assertThat(results).containsExactly(hintChunk, generalChunk);
    }

    @Test
    @DisplayName("Cosine Similarity trong AiKnowledgeChunkStore tính chính xác")
    void cosineSimilarityAccuracy() {
        double identical = AiKnowledgeChunkStore.cosineSimilarity(new float[]{1f, 2f, 3f}, new float[]{2f, 4f, 6f});
        double orthogonal = AiKnowledgeChunkStore.cosineSimilarity(new float[]{1f, 0f}, new float[]{0f, 1f});
        double opposite = AiKnowledgeChunkStore.cosineSimilarity(new float[]{1f, 0f}, new float[]{-1f, 0f});

        assertThat(identical).isCloseTo(1.0, within(1e-6));
        assertThat(orthogonal).isCloseTo(0.0, within(1e-6));
        assertThat(opposite).isCloseTo(-1.0, within(1e-6));
    }
}
