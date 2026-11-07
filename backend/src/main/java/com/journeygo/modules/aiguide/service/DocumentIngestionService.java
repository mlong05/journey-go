package com.journeygo.modules.aiguide.service;

import com.journeygo.modules.aiguide.config.GeminiAiProperties;
import com.journeygo.modules.aiguide.entity.AiKnowledgeChunk;
import com.journeygo.modules.aiguide.repository.AiKnowledgeChunkRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service xử lý quy trình nạp tài liệu (Ingestion Pipeline) vào Vector Database:
 * Làm sạch -> Cắt đoạn (Chunking) -> Gắn Context Prefix -> Gọi Embedding -> Lưu PostgreSQL.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentIngestionService {

    private final AiKnowledgeChunkRepository chunkRepository;
    private final AiEmbeddingService embeddingService;
    private final TextChunkerHelper chunkerHelper;
    private final GeminiAiProperties properties;

    /**
     * Nạp hoặc cập nhật dữ liệu văn hóa (Cultural Content) vào Vector Store.
     * Tự động xóa vector cũ trước khi nạp mới để tránh trùng lặp hoặc giữ lại dữ liệu cũ.
     */
    @Transactional
    public int ingestCulturalContent(Long contentId,
                                    Long destinationId,
                                    String destinationName,
                                    String category,
                                    String title,
                                    String rawContentText) {
        String sourceId = "CULTURAL_CONTENT:" + contentId;

        // 1. Xóa các chunks cũ của bài viết này nếu có
        chunkRepository.deleteBySourceId(sourceId);

        if (!StringUtils.hasText(rawContentText)) {
            log.warn("Nội dung bài viết id={} rỗng, không tiến hành nạp vector.", contentId);
            return 0;
        }

        // 2. Cắt nhỏ văn bản theo đoạn
        List<String> rawChunks = chunkerHelper.splitIntoChunks(
                rawContentText,
                properties.getChunkSize(),
                properties.getChunkOverlap()
        );

        if (rawChunks.isEmpty()) {
            return 0;
        }

        // 3. Gắn Context Prefix vào từng chunk
        List<String> prefixedChunks = rawChunks.stream()
                .map(chunk -> chunkerHelper.applyContextPrefix(chunk, destinationName, category))
                .toList();

        // 4. Gọi API Embedding hàng loạt
        List<float[]> embeddings = embeddingService.embedAll(prefixedChunks);

        if (embeddings.size() != prefixedChunks.size()) {
            log.error("Số lượng vector trả về ({}) không khớp số chunks ({}) cho sourceId={}",
                    embeddings.size(), prefixedChunks.size(), sourceId);
            return 0;
        }

        // 5. Chuẩn bị entities và lưu vào Database
        List<AiKnowledgeChunk> entities = new ArrayList<>(prefixedChunks.size());
        for (int i = 0; i < prefixedChunks.size(); i++) {
            Map<String, Object> metadata = new HashMap<>();
            metadata.put("source_type", "CULTURAL_CONTENT");
            metadata.put("source_id", contentId);
            metadata.put("title", title != null ? title : "");
            metadata.put("destination_name", destinationName != null ? destinationName : "");
            metadata.put("category", category != null ? category : "");
            metadata.put("chunk_index", i);

            AiKnowledgeChunk chunkEntity = AiKnowledgeChunk.builder()
                    .sourceId(sourceId)
                    .destinationId(destinationId)
                    .contentType(StringUtils.hasText(category) ? category : "CULTURAL_STORY")
                    .chunkText(prefixedChunks.get(i))
                    .metadata(metadata)
                    .embedding(embeddings.get(i))
                    .build();

            entities.add(chunkEntity);
        }

        chunkRepository.saveAll(entities);
        log.info("Đã nạp thành công {} vector chunks cho bài viết id={} tại destinationId={}",
                entities.size(), contentId, destinationId);

        return entities.size();
    }

    /**
     * Thu hồi/xóa các vector chunks khi bài viết bị xóa mềm hoặc đưa lại về trạng thái chờ duyệt.
     */
    @Transactional
    public void invalidateContent(String sourceId) {
        chunkRepository.deleteBySourceId(sourceId);
        log.info("Đã xóa sạch vector chunks của sourceId={}", sourceId);
    }

    /**
     * Thu hồi toàn bộ vector chunks của một địa điểm.
     */
    @Transactional
    public void invalidateDestination(Long destinationId) {
        chunkRepository.deleteByDestinationId(destinationId);
        log.info("Đã xóa sạch vector chunks của destinationId={}", destinationId);
    }
}
