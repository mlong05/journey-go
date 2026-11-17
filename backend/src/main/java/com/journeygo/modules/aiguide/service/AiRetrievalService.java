package com.journeygo.modules.aiguide.service;

import com.journeygo.modules.aiguide.config.GeminiAiProperties;
import com.journeygo.modules.aiguide.entity.AiKnowledgeChunk;
import com.journeygo.modules.aiguide.repository.AiKnowledgeChunkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.util.Collections;
import java.util.List;

/**
 * Service tách biệt phần truy vấn Embedding + Vector Search ra khỏi transaction chính
 * để tránh lỗi "current transaction is aborted" khi pgvector query thất bại.
 *
 * Chạy với Propagation.REQUIRES_NEW — transaction riêng biệt, fail không ảnh hưởng transaction cha.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AiRetrievalService {

    private final AiEmbeddingService embeddingService;
    private final AiKnowledgeChunkRepository chunkRepository;
    private final GeminiAiProperties properties;

    /**
     * Nhúng câu hỏi thành vector rồi truy vấn Top-K chunks tương đồng nhất.
     * Chạy trong transaction riêng (REQUIRES_NEW) để cô lập lỗi pgvector ra khỏi main transaction.
     *
     * @param question          Câu hỏi của du khách
     * @param destinationId     ID điểm đến (nếu có)
     * @param isTaskHintMode    Chế độ gợi ý nhiệm vụ
     * @return Danh sách chunks liên quan hoặc danh sách rỗng nếu có lỗi
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public List<AiKnowledgeChunk> retrieveRelevantChunks(String question,
                                                          Long destinationId,
                                                          boolean isTaskHintMode) {
        try {
            float[] queryVector = embeddingService.embed(question);
            String queryVectorStr = embeddingService.toVectorString(queryVector);

            int topK = properties.getTopK() > 0 ? properties.getTopK() : 4;
            String filterContentType = isTaskHintMode ? "TASK_HINT" : null;

            if (destinationId != null) {
                return chunkRepository.searchSimilar(destinationId, filterContentType, queryVectorStr, topK);
            } else {
                return chunkRepository.searchGlobalSimilar(queryVectorStr, topK);
            }
        } catch (Exception e) {
            log.warn("RAG Retrieval thất bại (không có chunks): {}. Chat vẫn tiếp tục không có ngữ cảnh.", e.getMessage());
            return Collections.emptyList();
        }
    }
}
