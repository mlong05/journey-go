package com.journeygo.modules.aiguide.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.aiguide.config.GeminiAiProperties;
import com.journeygo.modules.aiguide.dto.AiKnowledgeChunkAdminDto;
import com.journeygo.modules.aiguide.entity.AiChatHandoffStatus;
import com.journeygo.modules.aiguide.entity.AiDocumentType;
import com.journeygo.modules.aiguide.entity.AiKnowledgeChunk;
import com.journeygo.modules.aiguide.entity.AiKnowledgeDocument;
import com.journeygo.modules.aiguide.repository.AiChatMessageRepository;
import com.journeygo.modules.aiguide.repository.AiChatSessionRepository;
import com.journeygo.modules.aiguide.repository.AiKnowledgeChunkRepository;
import com.journeygo.modules.aiguide.repository.AiKnowledgeChunkStore;
import com.journeygo.modules.aiguide.repository.AiKnowledgeDocumentRepository;
import com.journeygo.modules.aiguide.service.DocumentIngestionService;
import com.journeygo.modules.content.entity.CulturalContent;
import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.entity.Theme;
import com.journeygo.modules.destination.repository.DestinationRepository;
import com.journeygo.modules.experience.entity.Experience;
import com.journeygo.modules.experience.entity.Task;
import com.journeygo.modules.experience.entity.enums.ExperienceStatus;
import com.journeygo.modules.experience.entity.enums.TaskStatus;
import com.journeygo.modules.experience.repository.TaskRepository;
import com.journeygo.modules.moderation.entity.enums.ContentReviewStatus;
import com.journeygo.modules.moderation.repository.ContentReviewRepository;
import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourDestination;
import com.journeygo.modules.tour.entity.TourPrice;
import com.journeygo.modules.tour.entity.TourStop;
import com.journeygo.modules.tour.entity.TourStopArtifact;
import com.journeygo.modules.tour.entity.TourStopExperience;
import com.journeygo.modules.tour.repository.TourRepository;
import java.text.NumberFormat;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * Controller dành cho Admin & Content Moderator để đồng bộ hóa và quản trị Vector Database.
 */
@RestController
@RequestMapping("/api/v1/admin/ai")
@RequiredArgsConstructor
@Slf4j
@SecurityRequirement(name = "Bearer Authentication")
@Tag(name = "AI Guide Admin", description = "Các API quản trị và đồng bộ Vector Database cho AI Virtual Guide")
public class AdminAiSyncController {

    private final DocumentIngestionService ingestionService;
    private final ContentReviewRepository contentReviewRepository;
    private final AiKnowledgeChunkRepository chunkRepository;
    private final DestinationRepository destinationRepository;
    private final TourRepository tourRepository;
    private final TaskRepository taskRepository;
    private final AiChatSessionRepository sessionRepository;
    private final AiChatMessageRepository messageRepository;
    private final AiKnowledgeChunkStore chunkStore;
    private final AiKnowledgeDocumentRepository documentRepository;
    private final GeminiAiProperties properties;

    @Operation(summary = "Đồng bộ toàn bộ dữ liệu tri thức vào Vector Store (nội dung văn hóa, điểm đến, trạm tour, nhiệm vụ và tài liệu Admin)")
    @PostMapping("/sync-all")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MODERATOR')")
    @Transactional
    public ResponseEntity<ApiResponse<Map<String, Object>>> syncAllApprovedContent() {
        log.info("Admin kích hoạt đồng bộ toàn bộ tri thức đã duyệt vào Vector Store");

        int totalChunks = 0;

        // 1. Nội dung văn hóa đã duyệt
        List<CulturalContent> approvedContents =
                contentReviewRepository.findAllPublicContent(ContentReviewStatus.APPROVED);
        for (CulturalContent item : approvedContents) {
            try {
                Long destinationId = item.getDestination() != null ? item.getDestination().getId() : null;
                String destinationName = item.getDestination() != null ? item.getDestination().getName() : "";
                if (destinationId != null) {
                    totalChunks += ingestionService.ingestCulturalContent(
                            item.getId(),
                            destinationId,
                            destinationName,
                            item.getContentType(),
                            item.getTitle(),
                            item.getContentText()
                    );
                }
            } catch (Exception ex) {
                log.error("Lỗi đồng bộ vector cho nội dung id={}: {}", item.getId(), ex.getMessage());
            }
        }

        // 2. Tổng quan điểm đến đã duyệt
        List<Destination> approvedDestinations = destinationRepository.findByApprovedTrueAndDeletedFalse();
        for (Destination dest : approvedDestinations) {
            try {
                totalChunks += ingestionService.ingestDestinationSummary(
                        dest.getId(),
                        dest.getName(),
                        buildDestinationDescription(dest),
                        dest.getAddress()
                );
            } catch (Exception ex) {
                log.error("Lỗi đồng bộ vector cho điểm đến id={}: {}", dest.getId(), ex.getMessage());
            }
        }

        // 3. Tour đã xuất bản (tổng quan kèm link /tours/{id}) + từng Điểm dừng trong Tour
        int processedTours = 0;
        int processedTourStops = 0;
        List<Tour> approvedTours = tourRepository.findByApprovedTrue();
        for (Tour tour : approvedTours) {
            try {
                totalChunks += ingestionService.ingestTourOverview(
                        tour.getTourId(),
                        tour.getTitle(),
                        tour.getRegion() != null ? tour.getRegion().getName() : null,
                        tour.getTheme() != null ? tour.getTheme().getName() : null,
                        formatTourDuration(tour),
                        formatAdultPrice(tour),
                        tour.getDescription(),
                        tour.getHighlights(),
                        extractStopNames(tour)
                );
                processedTours++;
            } catch (Exception ex) {
                log.error("Lỗi đồng bộ vector tổng quan tourId={}: {}", tour.getTourId(), ex.getMessage());
            }

            List<TourStop> stops = tour.getStops();
            if (stops == null || stops.isEmpty()) {
                continue;
            }
            for (TourStop stop : stops) {
                try {
                    List<String> artifactNotes = stop.getArtifacts() == null ? List.of() : stop.getArtifacts().stream()
                            .map(this::formatArtifactNote)
                            .filter(StringUtils::hasText)
                            .toList();
                    List<String> taskHintDescriptions = stop.getExperiences() == null ? List.of() : stop.getExperiences().stream()
                            .map(this::formatExperienceHint)
                            .filter(StringUtils::hasText)
                            .toList();

                    totalChunks += ingestionService.ingestTourStop(
                            stop.getId(),
                            tour.getTourId(),
                            tour.getTitle(),
                            stop.getName(),
                            stop.getShortDescription(),
                            stop.getGuestNote(),
                            stop.getCulturalContent(),
                            artifactNotes,
                            taskHintDescriptions
                    );
                    processedTourStops++;
                } catch (Exception ex) {
                    log.error("Lỗi đồng bộ vector cho trạm tour stopId={}: {}", stop.getId(), ex.getMessage());
                }
            }
        }

        // 4. Nhiệm vụ trải nghiệm đã xuất bản (chỉ tiêu đề + mô tả, tuyệt đối không kèm đáp án)
        int processedTasks = 0;
        List<Task> tasks = taskRepository.findAll();
        for (Task task : tasks) {
            try {
                if (task.getStatus() != TaskStatus.PUBLISHED) {
                    continue;
                }
                Experience exp = task.getExperience();
                if (exp == null || exp.getStatus() != ExperienceStatus.PUBLISHED || exp.getDestination() == null) {
                    continue;
                }
                Destination dest = exp.getDestination();
                if (dest.isDeleted()) {
                    continue;
                }
                totalChunks += ingestionService.ingestTaskHint(
                        task.getId(),
                        dest.getId(),
                        dest.getName(),
                        task.getTitle(),
                        task.getDescription()
                );
                processedTasks++;
            } catch (Exception ex) {
                log.error("Lỗi đồng bộ vector cho taskId={}: {}", task.getId(), ex.getMessage());
            }
        }

        // 5. Tài liệu Context bổ sung do Admin nạp (trừ AI_RULE vì AI_RULE tiêm thẳng vào System Prompt)
        int processedAdminDocuments = 0;
        Map<Long, String> destNameCache = approvedDestinations.stream()
                .collect(Collectors.toMap(Destination::getId, Destination::getName, (a, b) -> a));
        List<AiKnowledgeDocument> activeRagDocs = documentRepository.findByActiveTrueAndDocTypeNot(AiDocumentType.AI_RULE);
        for (AiKnowledgeDocument doc : activeRagDocs) {
            try {
                String destName = null;
                if (doc.getDestinationId() != null) {
                    destName = destNameCache.get(doc.getDestinationId());
                    if (destName == null) {
                        destName = destinationRepository.findByIdAndDeletedFalse(doc.getDestinationId())
                                .map(Destination::getName)
                                .orElse(null);
                    }
                }
                int created = ingestionService.ingestAdminDocument(
                        doc.getId(),
                        doc.getDestinationId(),
                        destName,
                        doc.getDocType().name(),
                        doc.getTitle(),
                        doc.getRawText()
                );
                doc.setChunkCount(created);
                documentRepository.save(doc);
                totalChunks += created;
                processedAdminDocuments++;
            } catch (Exception ex) {
                log.error("Lỗi đồng bộ vector cho tài liệu Admin id={}: {}", doc.getId(), ex.getMessage());
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("processedContents", approvedContents.size());
        result.put("processedDestinations", approvedDestinations.size());
        result.put("processedTours", processedTours);
        result.put("processedTourStops", processedTourStops);
        result.put("processedTasks", processedTasks);
        result.put("processedAdminDocuments", processedAdminDocuments);
        result.put("totalChunksCreated", totalChunks);
        result.put("message", "Đồng bộ Vector Store hoàn tất thành công");

        return ResponseEntity.ok(ApiResponse.success("Đồng bộ dữ liệu AI thành công", result));
    }

    @Operation(summary = "Đồng bộ nội dung của một địa điểm cụ thể vào Vector Store")
    @PostMapping("/destinations/{destinationId}/sync")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MODERATOR')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<Map<String, Object>>> syncDestinationContent(
            @PathVariable Long destinationId) {

        int totalChunks = 0;
        Destination dest = destinationRepository.findByIdAndDeletedFalse(destinationId).orElse(null);
        if (dest != null && dest.isApproved()) {
            try {
                totalChunks += ingestionService.ingestDestinationSummary(
                        dest.getId(),
                        dest.getName(),
                        buildDestinationDescription(dest),
                        dest.getAddress()
                );
            } catch (Exception ex) {
                log.error("Lỗi đồng bộ summary cho điểm đến id={}: {}", destinationId, ex.getMessage());
            }
        }

        List<CulturalContent> contents =
                contentReviewRepository.findPublicContentByDestination(destinationId, ContentReviewStatus.APPROVED);

        for (CulturalContent item : contents) {
            try {
                String destinationName = item.getDestination() != null ? item.getDestination().getName() : "";
                totalChunks += ingestionService.ingestCulturalContent(
                        item.getId(),
                        destinationId,
                        destinationName,
                        item.getContentType(),
                        item.getTitle(),
                        item.getContentText()
                );
            } catch (Exception ex) {
                log.error("Lỗi đồng bộ vector cho nội dung id={}: {}", item.getId(), ex.getMessage());
            }
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("destinationId", destinationId);
        result.put("processedContents", contents.size());
        result.put("totalChunksCreated", totalChunks);

        return ResponseEntity.ok(ApiResponse.success("Đồng bộ địa điểm thành công", result));
    }

    @Operation(summary = "Thống kê kho tri thức Vector Store và trạng thái AI Engine")
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MODERATOR')")
    public ResponseEntity<ApiResponse<Map<String, Object>>> getVectorStats() {
        long totalChunks = chunkRepository.count();
        long totalSessions = sessionRepository.count();
        long totalMessages = messageRepository.count();
        long pendingHandoffSessions = sessionRepository.countByHandoffStatus(AiChatHandoffStatus.WAITING_HUMAN);
        long activeHandoffSessions = sessionRepository.countByHandoffStatus(AiChatHandoffStatus.HUMAN_ACTIVE);

        Map<String, Long> chunksByContentType = new LinkedHashMap<>();
        for (Object[] row : chunkRepository.countGroupedByContentType()) {
            String type = row[0] != null ? String.valueOf(row[0]) : "UNKNOWN";
            long cnt = row[1] instanceof Number n ? n.longValue() : 0L;
            chunksByContentType.put(type, cnt);
        }

        Map<String, Object> stats = new LinkedHashMap<>();
        stats.put("totalKnowledgeChunks", totalChunks);
        stats.put("totalSessions", totalSessions);
        stats.put("totalMessages", totalMessages);
        stats.put("pendingHandoffSessions", pendingHandoffSessions);
        stats.put("activeHandoffSessions", activeHandoffSessions);
        stats.put("chunksByContentType", chunksByContentType);
        stats.put("totalAdminDocuments", documentRepository.count());
        stats.put("activeAdminDocuments", documentRepository.countByActiveTrue());
        stats.put("activeAiRules", documentRepository.countByDocTypeAndActiveTrue(AiDocumentType.AI_RULE));
        stats.put("pgvectorEnabled", chunkStore.isPgVectorEnabled());
        stats.put("chatModel", properties.getChatModel());
        stats.put("embeddingModel", properties.getEmbeddingModel());
        stats.put("apiKeyConfigured", StringUtils.hasText(properties.getApiKey()));

        return ResponseEntity.ok(ApiResponse.success("Lấy thống kê thành công", stats));
    }

    @Operation(summary = "Danh sách các đoạn tri thức trong Vector Store (hỗ trợ lọc & phân trang)")
    @GetMapping("/chunks")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MODERATOR')")
    @Transactional(readOnly = true)
    public ResponseEntity<ApiResponse<PageResponse<AiKnowledgeChunkAdminDto>>> getChunks(
            @RequestParam(required = false) Long destinationId,
            @RequestParam(required = false) String contentType,
            @RequestParam(required = false) Boolean globalOnly,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        Pageable pageable = PageRequest.of(safePage, safeSize, Sort.by(Sort.Direction.DESC, "updatedAt"));

        Page<AiKnowledgeChunk> chunkPage;
        if (Boolean.TRUE.equals(globalOnly)) {
            chunkPage = StringUtils.hasText(contentType)
                    ? chunkRepository.findByDestinationIdIsNullAndContentType(contentType.trim(), pageable)
                    : chunkRepository.findByDestinationIdIsNull(pageable);
        } else if (destinationId != null && StringUtils.hasText(contentType)) {
            chunkPage = chunkRepository.findByDestinationIdAndContentType(destinationId, contentType.trim(), pageable);
        } else if (destinationId != null) {
            chunkPage = chunkRepository.findByDestinationId(destinationId, pageable);
        } else if (StringUtils.hasText(contentType)) {
            chunkPage = chunkRepository.findByContentType(contentType.trim(), pageable);
        } else {
            chunkPage = chunkRepository.findAll(pageable);
        }

        Page<AiKnowledgeChunkAdminDto> dtoPage = chunkPage.map(AiKnowledgeChunkAdminDto::from);
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách tri thức vector thành công", PageResponse.from(dtoPage)));
    }

    @Operation(summary = "Xóa toàn bộ vector chunks theo sourceId")
    @DeleteMapping("/sources/{sourceId}")
    @PreAuthorize("hasAnyRole('ADMIN', 'CONTENT_MODERATOR')")
    public ResponseEntity<ApiResponse<Void>> deleteBySourceId(@PathVariable String sourceId) {
        ingestionService.invalidateContent(sourceId);
        return ResponseEntity.ok(ApiResponse.success("Đã xóa tri thức của nguồn " + sourceId, null));
    }

    private String buildDestinationDescription(Destination dest) {
        List<String> parts = new ArrayList<>();
        if (dest.getRegion() != null && StringUtils.hasText(dest.getRegion().getName())) {
            parts.add("Khu vực: " + dest.getRegion().getName().trim());
        }
        if (dest.getThemes() != null && !dest.getThemes().isEmpty()) {
            String themeNames = dest.getThemes().stream()
                    .map(Theme::getName)
                    .filter(StringUtils::hasText)
                    .sorted()
                    .collect(Collectors.joining(", "));
            if (StringUtils.hasText(themeNames)) {
                parts.add("Chủ đề: " + themeNames);
            }
        }
        return String.join(". ", parts);
    }

    private String formatArtifactNote(TourStopArtifact artifact) {
        String name = artifact.getName();
        String desc = artifact.getShortDescription();
        if (StringUtils.hasText(name) && StringUtils.hasText(desc)) {
            return name.trim() + ": " + desc.trim();
        }
        return StringUtils.hasText(name) ? name.trim() : (StringUtils.hasText(desc) ? desc.trim() : "");
    }

    private String formatExperienceHint(TourStopExperience exp) {
        if (exp == null || !StringUtils.hasText(exp.getActivityName())) {
            return "";
        }
        return "Hoạt động trải nghiệm tại điểm: " + exp.getActivityName().trim();
    }

    private String formatTourDuration(Tour tour) {
        if (tour.getDurationMinutes() != null && tour.getDurationMinutes() > 0) {
            int mins = tour.getDurationMinutes();
            if (mins % 60 == 0) {
                return (mins / 60) + " giờ";
            }
            return mins + " phút";
        }
        if (tour.getDurationDays() > 0) {
            String base = tour.getDurationDays() + " ngày";
            if (tour.getDurationNights() != null && tour.getDurationNights() > 0) {
                base += " " + tour.getDurationNights() + " đêm";
            }
            return base;
        }
        return "";
    }

    private String formatAdultPrice(Tour tour) {
        if (tour.getPrices() == null || tour.getPrices().isEmpty()) {
            return "";
        }
        return tour.getPrices().stream()
                .filter(p -> p != null && p.getGuestType() == GuestType.ADULT && p.getPrice() != null)
                .findFirst()
                .map(TourPrice::getPrice)
                .map(price -> NumberFormat.getNumberInstance(Locale.forLanguageTag("vi-VN")).format(price) + " VNĐ")
                .orElse("");
    }

    private List<String> extractStopNames(Tour tour) {
        if (tour.getStops() != null && !tour.getStops().isEmpty()) {
            return tour.getStops().stream()
                    .map(TourStop::getName)
                    .filter(StringUtils::hasText)
                    .toList();
        }
        if (tour.getTourDestinations() != null && !tour.getTourDestinations().isEmpty()) {
            return tour.getTourDestinations().stream()
                    .map(TourDestination::getDestination)
                    .filter(Objects::nonNull)
                    .map(Destination::getName)
                    .filter(StringUtils::hasText)
                    .toList();
        }
        return List.of();
    }
}
