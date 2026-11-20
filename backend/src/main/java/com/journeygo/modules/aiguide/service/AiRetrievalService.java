package com.journeygo.modules.aiguide.service;

import com.journeygo.modules.aiguide.config.GeminiAiProperties;
import com.journeygo.modules.aiguide.entity.AiKnowledgeChunk;
import com.journeygo.modules.aiguide.repository.AiKnowledgeChunkStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;

/**
 * Service tách biệt phần truy vấn Embedding + Vector Search ra khỏi transaction chính.
 * Hỗ trợ Dual-Mode qua {@link AiKnowledgeChunkStore} (pgvector HNSW trên Docker/Prod hoặc Cosine Fallback trên Windows local).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiRetrievalService {

    private final AiEmbeddingService embeddingService;
    private final AiKnowledgeChunkStore chunkStore;
    private final GeminiAiProperties properties;

    /**
     * Nhúng câu hỏi thành vector rồi truy vấn Top-K chunks tương đồng nhất.
     * Ở Task Hint Mode (tại điểm đến cụ thể): ưu tiên {@code TASK_HINT}, nếu chưa đủ {@code topK}
     * thì bổ sung thêm ngữ cảnh chung của chính {@code destinationId} đó (không chéo địa điểm khác).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public List<AiKnowledgeChunk> retrieveRelevantChunks(String question,
                                                         Long destinationId,
                                                         boolean isTaskHintMode) {
        try {
            float[] queryVector = embeddingService.embed(question);
            String queryVectorStr = embeddingService.toVectorString(queryVector);

            int topK = properties.getTopK() > 0 ? properties.getTopK() : 4;

            if (isTaskHintMode && destinationId != null) {
                List<AiKnowledgeChunk> hints = chunkStore.searchSimilar(
                        destinationId, "TASK_HINT", queryVector, queryVectorStr, topK);
                if (hints.size() >= topK) {
                    return hints;
                }
                List<AiKnowledgeChunk> supplement = chunkStore.searchSimilar(
                        destinationId, null, queryVector, queryVectorStr, topK);
                return mergeUniqueUpToLimit(hints, supplement, topK);
            }

            if (destinationId != null) {
                return chunkStore.searchSimilar(destinationId, true, null, queryVector, queryVectorStr, topK);
            }

            return chunkStore.searchSimilar(null, null, queryVector, queryVectorStr, topK);
        } catch (Exception e) {
            log.warn("RAG Retrieval thất bại (không có chunks): {}. Chat vẫn tiếp tục không có ngữ cảnh.", e.getMessage());
            return Collections.emptyList();
        }
    }

    private List<AiKnowledgeChunk> mergeUniqueUpToLimit(List<AiKnowledgeChunk> primary,
                                                        List<AiKnowledgeChunk> fallback,
                                                        int limit) {
        Map<UUID, AiKnowledgeChunk> ordered = new LinkedHashMap<>();
        if (primary != null) {
            for (AiKnowledgeChunk c : primary) {
                if (c != null && c.getId() != null) {
                    ordered.putIfAbsent(c.getId(), c);
                }
            }
        }
        if (fallback != null) {
            for (AiKnowledgeChunk c : fallback) {
                if (ordered.size() >= limit) {
                    break;
                }
                if (c != null && c.getId() != null) {
                    ordered.putIfAbsent(c.getId(), c);
                }
            }
        }
        return new ArrayList<>(ordered.values());
    }
}
