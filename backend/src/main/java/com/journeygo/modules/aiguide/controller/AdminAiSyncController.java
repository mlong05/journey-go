package com.journeygo.modules.aiguide.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.modules.aiguide.repository.AiKnowledgeChunkRepository;
import com.journeygo.modules.aiguide.service.DocumentIngestionService;
import com.journeygo.modules.content.entity.CulturalContent;
import com.journeygo.modules.moderation.entity.enums.ContentReviewStatus;
import com.journeygo.modules.moderation.repository.ContentReviewRepository;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Controller dành cho Admin & Content Moderator để đồng bộ hóa và quản trị Vector Database.
 */
@RestController
@RequestMapping("/api/v1/admin/ai")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "AI Guide Admin", description = "Các API quản trị và đồng bộ Vector Database cho AI Virtual Guide")
public class AdminAiSyncController {

    private final DocumentIngestionService ingestionService;
    private final ContentReviewRepository contentReviewRepository;
    private final AiKnowledgeChunkRepository chunkRepository;

    @Operation(summary = "Đồng bộ lại toàn bộ nội dung văn hóa đã duyệt vào Vector Store")
    @PostMapping("/sync-all")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MODERATOR')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> syncAllApprovedContent() {
        log.info("Admin kích hoạt đồng bộ toàn bộ nội dung đã duyệt vào Vector Store");

        List<CulturalContent> approvedContents =
                contentReviewRepository.findAllPublicContent(ContentReviewStatus.APPROVED);

        int totalContents = approvedContents.size();
        int totalChunks = 0;

        for (CulturalContent item : approvedContents) {
            try {
                Long destinationId = item.getDestination() != null ? item.getDestination().getId() : null;
                String destinationName = item.getDestination() != null ? item.getDestination().getName() : "";

                if (destinationId != null) {
                    int chunks = ingestionService.ingestCulturalContent(
                            item.getId(),
                            destinationId,
                            destinationName,
                            item.getContentType(),
                            item.getTitle(),
                            item.getContentText()
                    );
                    totalChunks += chunks;
                }
            } catch (Exception ex) {
                log.error("Lỗi đồng bộ vector cho nội dung id={}: {}", item.getId(), ex.getMessage());
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("processedContents", totalContents);
        result.put("totalChunksCreated", totalChunks);
        result.put("message", "Đồng bộ Vector Store hoàn tất thành công");

        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .code(200)
                .message("Đồng bộ dữ liệu AI thành công")
                .data(result)
                .build());
    }

    @Operation(summary = "Đồng bộ nội dung của một địa điểm cụ thể vào Vector Store")
    @PostMapping("/destinations/{destinationId}/sync")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MODERATOR')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> syncDestinationContent(
            @PathVariable Long destinationId) {

        List<CulturalContent> contents =
                contentReviewRepository.findPublicContentByDestination(destinationId, ContentReviewStatus.APPROVED);

        int totalChunks = 0;
        for (CulturalContent item : contents) {
            try {
                String destinationName = item.getDestination() != null ? item.getDestination().getName() : "";
                int chunks = ingestionService.ingestCulturalContent(
                        item.getId(),
                        destinationId,
                        destinationName,
                        item.getContentType(),
                        item.getTitle(),
                        item.getContentText()
                );
                totalChunks += chunks;
            } catch (Exception ex) {
                log.error("Lỗi đồng bộ vector cho nội dung id={}: {}", item.getId(), ex.getMessage());
            }
        }

        Map<String, Object> result = new HashMap<>();
        result.put("destinationId", destinationId);
        result.put("processedContents", contents.size());
        result.put("totalChunksCreated", totalChunks);

        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .code(200)
                .message("Đồng bộ địa điểm thành công")
                .data(result)
                .build());
    }

    @Operation(summary = "Thống kê số lượng vector chunks hiện có trong hệ thống")
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MODERATOR')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getVectorStats() {
        long totalChunks = chunkRepository.count();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalKnowledgeChunks", totalChunks);

        return ResponseEntity.ok(ApiResponse.<Map<String, Object>>builder()
                .code(200)
                .message("Lấy thống kê thành công")
                .data(stats)
                .build());
    }
}
