package com.journeygo.modules.aiguide.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.aiguide.config.GeminiAiProperties;
import com.journeygo.modules.aiguide.dto.AiKnowledgeChunkAdminDto;
import com.journeygo.modules.aiguide.entity.AiKnowledgeChunk;
import com.journeygo.modules.aiguide.repository.AiChatMessageRepository;
import com.journeygo.modules.aiguide.repository.AiChatSessionRepository;
import com.journeygo.modules.aiguide.repository.AiKnowledgeChunkRepository;
import com.journeygo.modules.aiguide.repository.AiKnowledgeChunkStore;
import com.journeygo.modules.aiguide.service.DocumentIngestionService;
import com.journeygo.modules.content.entity.CulturalContent;
import com.journeygo.modules.destination.entity.Destination;
import com.journeygo.modules.destination.entity.Region;
import com.journeygo.modules.destination.repository.DestinationRepository;
import com.journeygo.modules.experience.entity.Experience;
import com.journeygo.modules.experience.entity.Task;
import com.journeygo.modules.experience.entity.enums.ExperienceStatus;
import com.journeygo.modules.experience.entity.enums.TaskStatus;
import com.journeygo.modules.experience.repository.TaskRepository;
import com.journeygo.modules.moderation.entity.enums.ContentReviewStatus;
import com.journeygo.modules.moderation.repository.ContentReviewRepository;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourStop;
import com.journeygo.modules.tour.entity.TourStopArtifact;
import com.journeygo.modules.tour.entity.TourStopExperience;
import com.journeygo.modules.tour.repository.TourRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminAiSyncControllerTest {

    @Mock
    private DocumentIngestionService ingestionService;

    @Mock
    private ContentReviewRepository contentReviewRepository;

    @Mock
    private AiKnowledgeChunkRepository chunkRepository;

    @Mock
    private DestinationRepository destinationRepository;

    @Mock
    private TourRepository tourRepository;

    @Mock
    private TaskRepository taskRepository;

    @Mock
    private AiChatSessionRepository sessionRepository;

    @Mock
    private AiChatMessageRepository messageRepository;

    @Mock
    private AiKnowledgeChunkStore chunkStore;

    @Spy
    private GeminiAiProperties properties = new GeminiAiProperties();

    @InjectMocks
    private AdminAiSyncController controller;

    @Test
    @DisplayName("POST /sync-all đồng bộ cả CulturalContent, Destination, TourStop và Task")
    void syncAllApprovedContent_syncsAllSources() {
        Destination dest = Destination.builder()
                .id(50L).name("Hoàng Thành Huế").address("Huế").approved(true).deleted(false)
                .region(Region.builder().name("Miền Trung").build())
                .build();

        CulturalContent content = CulturalContent.builder()
                .id(1L).destination(dest).title("Ngọ Môn").contentType("HISTORY").contentText("Xây thời Minh Mạng").build();

        TourStop stop = TourStop.builder()
                .id(200L).name("Điện Thái Hòa").shortDescription("Nơi thiết triều").culturalContent("Nội dung văn hóa")
                .artifacts(List.of(TourStopArtifact.builder().name("Ngai Vàng").shortDescription("Di sản").build()))
                .experiences(List.of(TourStopExperience.builder().activityName("Tìm hiểu kiến trúc").build()))
                .build();
        Tour tour = Tour.builder().tourId(10L).title("Tour Cố Đô").approved(true).stops(List.of(stop)).build();

        Experience exp = Experience.builder().id(30L).destination(dest).status(ExperienceStatus.PUBLISHED).build();
        Task task = Task.builder().id(40L).title("Tìm bia cổ").description("Quan sát sân rồng").status(TaskStatus.PUBLISHED).experience(exp).build();

        when(contentReviewRepository.findAllPublicContent(ContentReviewStatus.APPROVED)).thenReturn(List.of(content));
        when(destinationRepository.findByApprovedTrueAndDeletedFalse()).thenReturn(List.of(dest));
        when(tourRepository.findByApprovedTrue()).thenReturn(List.of(tour));
        when(taskRepository.findAll()).thenReturn(List.of(task));

        when(ingestionService.ingestCulturalContent(eq(1L), eq(50L), anyString(), anyString(), anyString(), anyString())).thenReturn(2);
        when(ingestionService.ingestDestinationSummary(eq(50L), anyString(), anyString(), anyString())).thenReturn(1);
        when(ingestionService.ingestTourStop(eq(200L), eq(10L), anyString(), anyString(), any(), any(), any(), anyList(), anyList())).thenReturn(3);
        when(ingestionService.ingestTaskHint(eq(40L), eq(50L), anyString(), anyString(), anyString())).thenReturn(1);

        ResponseEntity<ApiResponse<Map<String, Object>>> res = controller.syncAllApprovedContent();

        assertThat(res.getStatusCode().value()).isEqualTo(200);
        Map<String, Object> data = res.getBody().getData();
        assertThat(data).containsEntry("processedContents", 1);
        assertThat(data).containsEntry("processedDestinations", 1);
        assertThat(data).containsEntry("processedTourStops", 1);
        assertThat(data).containsEntry("processedTasks", 1);
        assertThat(data).containsEntry("totalChunksCreated", 7);
    }

    @Test
    @DisplayName("POST /destinations/{id}/sync đồng bộ summary và nội dung văn hóa địa điểm")
    void syncDestinationContent_syncsSummaryAndContents() {
        Destination dest = Destination.builder().id(50L).name("Chùa Thiên Mụ").address("Huế").approved(true).deleted(false).build();
        CulturalContent content = CulturalContent.builder().id(1L).destination(dest).title("Tháp Phước Duyên").contentType("STORY").contentText("Cao 21m").build();

        when(destinationRepository.findByIdAndDeletedFalse(50L)).thenReturn(Optional.of(dest));
        when(contentReviewRepository.findPublicContentByDestination(50L, ContentReviewStatus.APPROVED)).thenReturn(List.of(content));
        when(ingestionService.ingestDestinationSummary(eq(50L), anyString(), anyString(), anyString())).thenReturn(1);
        when(ingestionService.ingestCulturalContent(eq(1L), eq(50L), anyString(), anyString(), anyString(), anyString())).thenReturn(2);

        ResponseEntity<ApiResponse<Map<String, Object>>> res = controller.syncDestinationContent(50L);

        assertThat(res.getStatusCode().value()).isEqualTo(200);
        assertThat(res.getBody().getData()).containsEntry("totalChunksCreated", 3);
    }

    @Test
    @DisplayName("GET /stats trả đầy đủ thống kê Vector DB, models và cờ apiKeyConfigured")
    void getVectorStats_returnsEngineAndCountStats() {
        properties.setApiKey("real-key");
        when(chunkRepository.count()).thenReturn(15L);
        when(sessionRepository.count()).thenReturn(4L);
        when(messageRepository.count()).thenReturn(18L);
        when(chunkRepository.countGroupedByContentType()).thenReturn(List.of(
                new Object[]{"CULTURAL_STORY", 10L},
                new Object[]{"TASK_HINT", 5L}
        ));
        when(chunkStore.isPgVectorEnabled()).thenReturn(false);

        ResponseEntity<ApiResponse<Map<String, Object>>> res = controller.getVectorStats();

        Map<String, Object> stats = res.getBody().getData();
        assertThat(stats).containsEntry("totalKnowledgeChunks", 15L);
        assertThat(stats).containsEntry("totalSessions", 4L);
        assertThat(stats).containsEntry("totalMessages", 18L);
        assertThat(stats).containsEntry("pgvectorEnabled", false);
        assertThat(stats).containsEntry("apiKeyConfigured", true);
        assertThat(stats).containsEntry("chatModel", "gemini-3.5-flash-lite");
        assertThat(stats).containsEntry("embeddingModel", "gemini-embedding-001");
    }

    @Test
    @DisplayName("GET /chunks lọc theo destinationId & contentType và không trả mảng vector nặng")
    void getChunks_filtersAndReturnsAdminDtos() {
        AiKnowledgeChunk chunk = AiKnowledgeChunk.builder()
                .id(UUID.randomUUID())
                .sourceId("CULTURAL_CONTENT:1")
                .destinationId(50L)
                .contentType("CULTURAL_STORY")
                .chunkText("Đoạn tri thức mẫu")
                .metadata(Map.of("title", "Ngọ Môn"))
                .updatedAt(Instant.now())
                .build();

        when(chunkRepository.findByDestinationIdAndContentType(eq(50L), eq("CULTURAL_STORY"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(chunk)));

        ResponseEntity<ApiResponse<PageResponse<AiKnowledgeChunkAdminDto>>> res =
                controller.getChunks(50L, "CULTURAL_STORY", 0, 20);

        assertThat(res.getStatusCode().value()).isEqualTo(200);
        assertThat(res.getBody().getData().getContent()).hasSize(1);
        assertThat(res.getBody().getData().getContent().get(0).sourceId()).isEqualTo("CULTURAL_CONTENT:1");
    }

    @Test
    @DisplayName("DELETE /sources/{sourceId} gọi invalidateContent")
    void deleteBySourceId_callsInvalidate() {
        ResponseEntity<ApiResponse<Void>> res = controller.deleteBySourceId("CULTURAL_CONTENT:1");

        assertThat(res.getStatusCode().value()).isEqualTo(200);
        verify(ingestionService).invalidateContent("CULTURAL_CONTENT:1");
    }
}
