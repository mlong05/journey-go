package com.journeygo.modules.aiguide.service;

import com.journeygo.modules.aiguide.config.GeminiAiProperties;
import com.journeygo.modules.aiguide.entity.AiKnowledgeChunk;
import com.journeygo.modules.aiguide.repository.AiKnowledgeChunkRepository;
import com.journeygo.modules.aiguide.repository.AiKnowledgeChunkStore;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class DocumentIngestionServiceTest {

    @Mock
    private AiKnowledgeChunkRepository chunkRepository;

    @Mock
    private AiKnowledgeChunkStore chunkStore;

    @Mock
    private AiEmbeddingService embeddingService;

    @Spy
    private TextChunkerHelper chunkerHelper = new TextChunkerHelper();

    @Spy
    private GeminiAiProperties properties = new GeminiAiProperties();

    @InjectMocks
    private DocumentIngestionService ingestionService;

    @BeforeEach
    void setUp() {
        properties.setChunkSize(400);
        properties.setChunkOverlap(50);
    }

    @Test
    @DisplayName("ingestCulturalContent xóa chunks cũ, cắt đoạn, gắn prefix và lưu qua chunkStore")
    void ingestCulturalContent_success() {
        when(embeddingService.embedAll(anyList())).thenReturn(List.of(new float[]{0.1f, 0.2f}));

        int count = ingestionService.ingestCulturalContent(
                15L, 50L, "Chùa Thiên Mụ", "CULTURAL_STORY", "Lịch sử chùa",
                "<p>Chùa Thiên Mụ được xây dựng năm 1601.</p>"
        );

        assertThat(count).isEqualTo(1);
        verify(chunkRepository).deleteBySourceId("CULTURAL_CONTENT:15");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<AiKnowledgeChunk>> captor = ArgumentCaptor.forClass(List.class);
        verify(chunkStore).saveChunks(captor.capture());
        AiKnowledgeChunk saved = captor.getValue().get(0);
        assertThat(saved.getSourceId()).isEqualTo("CULTURAL_CONTENT:15");
        assertThat(saved.getDestinationId()).isEqualTo(50L);
        assertThat(saved.getContentType()).isEqualTo("CULTURAL_STORY");
        assertThat(saved.getChunkText()).startsWith("[Địa điểm: Chùa Thiên Mụ - Danh mục: CULTURAL_STORY]");
        assertThat(saved.getMetadata()).containsEntry("destination_name", "Chùa Thiên Mụ");
    }

    @Test
    @DisplayName("ingestDestinationSummary lưu với sourceId DESTINATION và type TOUR_INFO")
    void ingestDestinationSummary_success() {
        when(embeddingService.embedAll(anyList())).thenReturn(List.of(new float[]{0.3f, 0.4f}));

        int count = ingestionService.ingestDestinationSummary(
                50L, "Đại Nội Huế", "Khu vực: Miền Trung. Chủ đề: Di sản", "Thừa Thiên Huế"
        );

        assertThat(count).isEqualTo(1);
        verify(chunkRepository).deleteBySourceId("DESTINATION:50");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<AiKnowledgeChunk>> captor = ArgumentCaptor.forClass(List.class);
        verify(chunkStore).saveChunks(captor.capture());
        assertThat(captor.getValue().get(0).getContentType()).isEqualTo("TOUR_INFO");
        assertThat(captor.getValue().get(0).getSourceId()).isEqualTo("DESTINATION:50");
    }

    @Test
    @DisplayName("ingestTaskHint và ingestTourStop lưu TASK_HINT tách biệt và không lộ đáp án")
    void ingestTaskHintAndTourStop_success() {
        when(embeddingService.embedAll(anyList())).thenReturn(List.of(new float[]{0.5f, 0.6f}));

        int taskChunks = ingestionService.ingestTaskHint(
                7L, 50L, "Hoàng Thành Huế", "Tìm bia đá cổ", "Hãy quan sát khu vực Ngọ Môn."
        );
        int stopChunks = ingestionService.ingestTourStop(
                88L, 12L, "Hành trình Cố đô", "Điện Thái Hòa",
                "Nơi thiết triều nhà Nguyễn", "Trang phục lịch sự", "Câu chuyện văn hóa...",
                List.of("Ngai vàng: Bảo vật quốc gia"), List.of("Hoạt động trải nghiệm: Quan sát mái ngói")
        );

        assertThat(taskChunks).isEqualTo(1);
        assertThat(stopChunks).isEqualTo(2);
        verify(chunkRepository).deleteBySourceId("TASK:7");
        verify(chunkRepository).deleteBySourceId("TOUR_STOP:88");
        verify(chunkRepository).deleteBySourceId("TOUR_STOP_HINT:88");
        verify(chunkStore, times(3)).saveChunks(anyList());
    }

    @Test
    @DisplayName("invalidateContent xóa vector theo sourceId")
    void invalidateContent_deletesBySourceId() {
        ingestionService.invalidateContent("CULTURAL_CONTENT:99");
        verify(chunkRepository).deleteBySourceId("CULTURAL_CONTENT:99");
    }
}
