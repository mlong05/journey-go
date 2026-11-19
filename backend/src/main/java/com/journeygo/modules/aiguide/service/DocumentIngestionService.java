package com.journeygo.modules.aiguide.service;

import com.journeygo.modules.aiguide.config.GeminiAiProperties;
import com.journeygo.modules.aiguide.entity.AiKnowledgeChunk;
import com.journeygo.modules.aiguide.repository.AiKnowledgeChunkRepository;
import com.journeygo.modules.aiguide.repository.AiKnowledgeChunkStore;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Service xử lý quy trình nạp tài liệu (Ingestion Pipeline) vào Vector Database:
 * Làm sạch -> Cắt đoạn (Chunking) -> Gắn Context Prefix -> Gọi Embedding -> Lưu PostgreSQL (pgvector / TEXT fallback).
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class DocumentIngestionService {

    private final AiKnowledgeChunkRepository chunkRepository;
    private final AiKnowledgeChunkStore chunkStore;
    private final AiEmbeddingService embeddingService;
    private final TextChunkerHelper chunkerHelper;
    private final GeminiAiProperties properties;

    /**
     * Nạp hoặc cập nhật dữ liệu văn hóa (Cultural Content) vào Vector Store.
     * Tự động xóa vector cũ trước khi nạp mới để tránh trùng lặp hoặc giữ lại dữ liệu cũ.
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int ingestCulturalContent(Long contentId,
                                     Long destinationId,
                                     String destinationName,
                                     String category,
                                     String title,
                                     String rawContentText) {
        String sourceId = "CULTURAL_CONTENT:" + contentId;
        Map<String, Object> baseMeta = new HashMap<>();
        baseMeta.put("source_type", "CULTURAL_CONTENT");
        baseMeta.put("source_id", contentId);
        baseMeta.put("title", title != null ? title : "");
        baseMeta.put("destination_name", destinationName != null ? destinationName : "");
        baseMeta.put("category", category != null ? category : "");

        String contentType = StringUtils.hasText(category) ? category : "CULTURAL_STORY";
        return ingestDocument(sourceId, destinationId, destinationName, contentType, rawContentText, baseMeta);
    }

    /**
     * Nạp thông tin tổng quan của một địa điểm (tên, địa chỉ, khu vực, chủ đề).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int ingestDestinationSummary(Long destinationId,
                                        String destinationName,
                                        String description,
                                        String address) {
        String sourceId = "DESTINATION:" + destinationId;
        StringBuilder body = new StringBuilder();
        if (StringUtils.hasText(destinationName)) {
            body.append("Điểm đến: ").append(destinationName.trim()).append(".\n");
        }
        if (StringUtils.hasText(address)) {
            body.append("Địa chỉ: ").append(address.trim()).append(".\n");
        }
        if (StringUtils.hasText(description)) {
            body.append(description.trim());
        }

        Map<String, Object> baseMeta = new HashMap<>();
        baseMeta.put("source_type", "DESTINATION");
        baseMeta.put("source_id", destinationId);
        baseMeta.put("title", destinationName != null ? destinationName : ("Điểm đến #" + destinationId));
        baseMeta.put("destination_name", destinationName != null ? destinationName : "");
        baseMeta.put("address", address != null ? address : "");

        return ingestDocument(sourceId, destinationId, destinationName, "TOUR_INFO", body.toString(), baseMeta);
    }

    /**
     * Nạp gợi ý nhiệm vụ thực tế (TUYỆT ĐỐI KHÔNG nạp đáp án/referenceAnswer/expectedText).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int ingestTaskHint(Long taskId,
                              Long destinationId,
                              String destinationName,
                              String taskTitle,
                              String taskDescription) {
        String sourceId = "TASK:" + taskId;
        StringBuilder body = new StringBuilder();
        if (StringUtils.hasText(taskTitle)) {
            body.append("Nhiệm vụ: ").append(taskTitle.trim()).append(".\n");
        }
        if (StringUtils.hasText(taskDescription)) {
            body.append("Mô tả & gợi ý quan sát: ").append(taskDescription.trim());
        }

        Map<String, Object> baseMeta = new HashMap<>();
        baseMeta.put("source_type", "TASK");
        baseMeta.put("source_id", taskId);
        baseMeta.put("title", taskTitle != null ? taskTitle : ("Nhiệm vụ #" + taskId));
        baseMeta.put("destination_name", destinationName != null ? destinationName : "");

        return ingestDocument(sourceId, destinationId, destinationName, "TASK_HINT", body.toString(), baseMeta);
    }

    /**
     * Nạp nội dung một điểm dừng trong Tour Wizard (truyện văn hóa, hiện vật, lưu ý du khách)
     * và các mô tả trải nghiệm (không kèm đáp án câu hỏi).
     */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public int ingestTourStop(Long stopId,
                              Long tourId,
                              String tourName,
                              String stopName,
                              String shortDescription,
                              String guestNote,
                              String culturalContent,
                              List<String> artifactNotes,
                              List<String> taskHintDescriptions) {
        int totalChunks = 0;
        String effectiveName = StringUtils.hasText(stopName) ? stopName : ("Trạm #" + stopId);

        StringBuilder storyBuilder = new StringBuilder();
        if (StringUtils.hasText(tourName)) {
            storyBuilder.append("Hành trình: ").append(tourName.trim()).append(".\n");
        }
        if (StringUtils.hasText(shortDescription)) {
            storyBuilder.append("Giới thiệu: ").append(shortDescription.trim()).append("\n\n");
        }
        if (StringUtils.hasText(guestNote)) {
            storyBuilder.append("Lưu ý tham quan: ").append(guestNote.trim()).append("\n\n");
        }
        if (StringUtils.hasText(culturalContent)) {
            storyBuilder.append(culturalContent.trim()).append("\n\n");
        }
        if (artifactNotes != null && !artifactNotes.isEmpty()) {
            storyBuilder.append("Hiện vật / di tích nổi bật:\n");
            for (String note : artifactNotes) {
                if (StringUtils.hasText(note)) {
                    storyBuilder.append("- ").append(note.trim()).append("\n");
                }
            }
        }

        Map<String, Object> storyMeta = new HashMap<>();
        storyMeta.put("source_type", "TOUR_STOP");
        storyMeta.put("source_id", stopId);
        storyMeta.put("tour_id", tourId);
        storyMeta.put("title", effectiveName + (StringUtils.hasText(tourName) ? (" (" + tourName + ")") : ""));
        storyMeta.put("destination_name", effectiveName);

        totalChunks += ingestDocument(
                "TOUR_STOP:" + stopId,
                stopId,
                effectiveName,
                "CULTURAL_STORY",
                storyBuilder.toString(),
                storyMeta
        );

        String hintText = "";
        if (taskHintDescriptions != null && !taskHintDescriptions.isEmpty()) {
            StringBuilder hintBuilder = new StringBuilder();
            for (String desc : taskHintDescriptions) {
                if (StringUtils.hasText(desc)) {
                    hintBuilder.append("- ").append(desc.trim()).append("\n");
                }
            }
            hintText = hintBuilder.toString();
        }
        Map<String, Object> hintMeta = new HashMap<>();
        hintMeta.put("source_type", "TOUR_STOP_HINT");
        hintMeta.put("source_id", stopId);
        hintMeta.put("tour_id", tourId);
        hintMeta.put("title", "Trải nghiệm tại " + effectiveName);
        hintMeta.put("destination_name", effectiveName);

        totalChunks += ingestDocument(
                "TOUR_STOP_HINT:" + stopId,
                stopId,
                effectiveName,
                "TASK_HINT",
                hintText,
                hintMeta
        );

        return totalChunks;
    }

    private int ingestDocument(String sourceId,
                               Long destinationId,
                               String destinationName,
                               String contentType,
                               String rawContentText,
                               Map<String, Object> baseMeta) {
        // 1. Xóa các chunks cũ của nguồn này trước (tránh trùng lặp / dữ liệu cũ)
        chunkRepository.deleteBySourceId(sourceId);

        if (destinationId == null || !StringUtils.hasText(rawContentText)) {
            log.debug("Bỏ qua nạp vector cho sourceId={} do destinationId null hoặc nội dung rỗng.", sourceId);
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
                .map(chunk -> chunkerHelper.applyContextPrefix(chunk, destinationName, contentType))
                .toList();

        // 4. Gọi API Embedding hàng loạt
        List<float[]> embeddings = embeddingService.embedAll(prefixedChunks);

        if (embeddings.size() != prefixedChunks.size()) {
            log.error("Số lượng vector trả về ({}) không khớp số chunks ({}) cho sourceId={}",
                    embeddings.size(), prefixedChunks.size(), sourceId);
            return 0;
        }

        // 5. Chuẩn bị entities và lưu qua Dual-Mode Store
        List<AiKnowledgeChunk> entities = new ArrayList<>(prefixedChunks.size());
        for (int i = 0; i < prefixedChunks.size(); i++) {
            Map<String, Object> metadata = new HashMap<>(baseMeta);
            metadata.put("chunk_index", i);

            AiKnowledgeChunk chunkEntity = AiKnowledgeChunk.builder()
                    .sourceId(sourceId)
                    .destinationId(destinationId)
                    .contentType(StringUtils.hasText(contentType) ? contentType : "CULTURAL_STORY")
                    .chunkText(prefixedChunks.get(i))
                    .metadata(metadata)
                    .embedding(embeddings.get(i))
                    .build();

            entities.add(chunkEntity);
        }

        chunkStore.saveChunks(entities);
        log.info("Đã nạp thành công {} vector chunks cho sourceId={} (type={}) tại destinationId={}",
                entities.size(), sourceId, contentType, destinationId);

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

