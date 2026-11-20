package com.journeygo.modules.aiguide.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.aiguide.config.GeminiAiProperties;
import com.journeygo.modules.aiguide.dto.AiChatRequest;
import com.journeygo.modules.aiguide.dto.AiChatResponse;
import com.journeygo.modules.aiguide.dto.AiChatSessionDto;
import com.journeygo.modules.aiguide.entity.AiChatMessage;
import com.journeygo.modules.aiguide.entity.AiChatSession;
import com.journeygo.modules.aiguide.entity.AiDocumentScope;
import com.journeygo.modules.aiguide.entity.AiDocumentType;
import com.journeygo.modules.aiguide.entity.AiKnowledgeChunk;
import com.journeygo.modules.aiguide.entity.AiKnowledgeDocument;
import com.journeygo.modules.aiguide.repository.AiChatMessageRepository;
import com.journeygo.modules.aiguide.repository.AiChatSessionRepository;
import com.journeygo.modules.aiguide.repository.AiKnowledgeDocumentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class VirtualGuideChatServiceTest {

    @Mock
    private AiChatSessionRepository sessionRepository;

    @Mock
    private AiChatMessageRepository messageRepository;

    @Mock
    private GeminiChatClient chatClient;

    @Spy
    private VirtualGuidePromptTemplate promptTemplate = new VirtualGuidePromptTemplate();

    @Spy
    private GeminiAiProperties properties = new GeminiAiProperties();

    @Mock
    private AiRetrievalService aiRetrievalService;

    @Mock
    private AiRateLimiterService aiRateLimiterService;

    @Mock
    private AiKnowledgeDocumentRepository documentRepository;

    @InjectMocks
    private VirtualGuideChatService chatService;

    private UUID existingSessionId;
    private AiChatSession existingSession;

    @BeforeEach
    void setUp() {
        existingSessionId = UUID.randomUUID();
        existingSession = AiChatSession.builder()
                .id(existingSessionId)
                .userId(100L)
                .currentDestinationId(50L)
                .createdAt(Instant.now())
                .updatedAt(Instant.now())
                .build();
    }

    @Test
    @DisplayName("Tiếp tục đúng sessionId được truyền từ client, lấy Memory và trích xuất citations + destination_name")
    void chat_withSessionId_normalGuideMode() {
        UUID userMsgId = UUID.randomUUID();
        UUID prevUserMsgId = UUID.randomUUID();
        UUID prevAiMsgId = UUID.randomUUID();

        when(sessionRepository.findByIdAndUserId(existingSessionId, 100L)).thenReturn(Optional.of(existingSession));
        when(sessionRepository.save(any(AiChatSession.class))).thenAnswer(inv -> inv.getArgument(0));
        when(messageRepository.save(any(AiChatMessage.class))).thenAnswer(inv -> {
            AiChatMessage msg = inv.getArgument(0);
            if ("USER".equals(msg.getRole())) {
                msg.setId(userMsgId);
            } else {
                msg.setId(UUID.randomUUID());
            }
            if (msg.getCreatedAt() == null) {
                msg.setCreatedAt(Instant.now());
            }
            return msg;
        });

        AiKnowledgeChunk chunk = AiKnowledgeChunk.builder()
                .id(UUID.randomUUID())
                .sourceId("CULTURAL_CONTENT:1")
                .destinationId(50L)
                .contentType("CULTURAL_STORY")
                .chunkText("[Địa điểm: Chùa Thiên Mụ]\nChùa được xây năm 1601.")
                .metadata(Map.of("title", "Lịch sử Chùa Thiên Mụ", "destination_name", "Chùa Thiên Mụ"))
                .build();
        when(aiRetrievalService.retrieveRelevantChunks("Chùa xây năm nào?", 50L, false)).thenReturn(List.of(chunk));

        when(messageRepository.findRecentMessagesAsc(existingSessionId, 8)).thenReturn(List.of(
                AiChatMessage.builder().id(prevUserMsgId).role("USER").content("Xin chào").build(),
                AiChatMessage.builder().id(prevAiMsgId).role("ASSISTANT").content("Chào bạn").build(),
                AiChatMessage.builder().id(userMsgId).role("USER").content("Chùa xây năm nào?").build()
        ));

        when(chatClient.generateReply(
                eq(VirtualGuidePromptTemplate.NORMAL_GUIDE_SYSTEM_PROMPT),
                anyList(),
                anyString(),
                anyDouble(),
                anyInt()
        )).thenReturn("Chùa Thiên Mụ được xây dựng vào năm 1601.");

        AiChatRequest request = AiChatRequest.builder()
                .sessionId(existingSessionId)
                .question("Chùa xây năm nào?")
                .build();

        AiChatResponse response = chatService.chat(100L, request);

        assertThat(response.getSessionId()).isEqualTo(existingSessionId);
        assertThat(response.getMode()).isEqualTo("NORMAL_GUIDE");
        assertThat(response.getAnswer()).contains("1601");
        assertThat(response.getCitations()).containsExactly("Lịch sử Chùa Thiên Mụ");

        @SuppressWarnings("unchecked")
        ArgumentCaptor<List<GeminiChatClient.ChatTurn>> historyCaptor = ArgumentCaptor.forClass(List.class);
        ArgumentCaptor<String> promptCaptor = ArgumentCaptor.forClass(String.class);
        verify(chatClient).generateReply(
                eq(VirtualGuidePromptTemplate.NORMAL_GUIDE_SYSTEM_PROMPT),
                historyCaptor.capture(),
                promptCaptor.capture(),
                anyDouble(),
                anyInt()
        );
        // Không lặp lại tin nhắn hiện tại vừa gửi trong history
        assertThat(historyCaptor.getValue()).hasSize(2);
        assertThat(promptCaptor.getValue()).contains("Chùa Thiên Mụ");
    }

    @Test
    @DisplayName("Task Hint Mode kích hoạt khi taskId != null và dùng TASK_HINT_SYSTEM_PROMPT")
    void chat_withTaskId_triggersTaskHintMode() {
        when(sessionRepository.findFirstByUserIdAndCurrentDestinationIdOrderByUpdatedAtDesc(100L, 50L))
                .thenReturn(Optional.of(existingSession));
        when(sessionRepository.save(any(AiChatSession.class))).thenAnswer(inv -> inv.getArgument(0));
        when(messageRepository.save(any(AiChatMessage.class))).thenAnswer(inv -> {
            AiChatMessage m = inv.getArgument(0);
            m.setId(UUID.randomUUID());
            m.setCreatedAt(Instant.now());
            return m;
        });
        when(aiRetrievalService.retrieveRelevantChunks("Gợi ý cho tôi", 50L, true)).thenReturn(List.of());
        when(messageRepository.findRecentMessagesAsc(existingSessionId, 8)).thenReturn(List.of());
        when(chatClient.generateReply(
                eq(VirtualGuidePromptTemplate.TASK_HINT_SYSTEM_PROMPT),
                anyList(),
                anyString(),
                anyDouble(),
                anyInt()
        )).thenReturn("Hãy quan sát hoa văn trên bia đá phía trước nhé!");

        AiChatRequest request = AiChatRequest.builder()
                .destinationId(50L)
                .taskId(99L)
                .question("Gợi ý cho tôi")
                .build();

        AiChatResponse response = chatService.chat(100L, request);

        assertThat(response.getMode()).isEqualTo("TASK_HINT");
        assertThat(response.getAnswer()).contains("bia đá");
    }

    @Test
    @DisplayName("Khi destinationId == null, tìm lại phiên chung qua findFirstByUserIdAndCurrentDestinationIdIsNullOrderByUpdatedAtDesc")
    void getOrCreateSession_nullDestination_reusesGeneralSession() {
        UUID generalId = UUID.randomUUID();
        AiChatSession general = AiChatSession.builder().id(generalId).userId(100L).currentDestinationId(null).build();
        when(sessionRepository.findFirstByUserIdAndCurrentDestinationIdIsNullOrderByUpdatedAtDesc(100L))
                .thenReturn(Optional.of(general));

        AiChatSessionDto dto = chatService.getOrCreateSession(100L, null, false);

        assertThat(dto.getId()).isEqualTo(generalId);
        verify(sessionRepository, never()).save(any());
    }

    @Test
    @DisplayName("forceNew = true luôn tạo phiên trò chuyện mới thay vì dùng lại phiên cũ")
    void getOrCreateSession_forceNew_createsFreshSession() {
        UUID freshId = UUID.randomUUID();
        when(sessionRepository.save(any(AiChatSession.class))).thenAnswer(inv -> {
            AiChatSession s = inv.getArgument(0);
            s.setId(freshId);
            return s;
        });

        AiChatSessionDto dto = chatService.getOrCreateSession(100L, 50L, true);

        assertThat(dto.getId()).isEqualTo(freshId);
        verify(sessionRepository, never()).findFirstByUserIdAndCurrentDestinationIdOrderByUpdatedAtDesc(any(), any());
        verify(sessionRepository).save(any(AiChatSession.class));
    }

    @Test
    @DisplayName("Vượt giới hạn tốc độ hỏi AI ném AI_RATE_LIMITED")
    void chat_whenRateLimited_throwsAiRateLimited() {
        doThrow(new AppException(ErrorCode.AI_RATE_LIMITED)).when(aiRateLimiterService).checkAndConsume(100L);

        AiChatRequest request = AiChatRequest.builder().question("Hỏi liên tục").build();

        assertThatThrownBy(() -> chatService.chat(100L, request))
                .isInstanceOf(AppException.class)
                .extracting(ex -> ((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.AI_RATE_LIMITED);
    }

    @Test
    @DisplayName("Kiểm tra quyền sở hữu session ném AI_SESSION_NOT_FOUND nếu user khác truy cập")
    void chat_whenSessionNotOwned_throwsNotFound() {
        when(sessionRepository.findByIdAndUserId(existingSessionId, 999L)).thenReturn(Optional.empty());

        AiChatRequest request = AiChatRequest.builder()
                .sessionId(existingSessionId)
                .question("Xem lén phiên")
                .build();

        assertThatThrownBy(() -> chatService.chat(999L, request))
                .isInstanceOf(AppException.class)
                .extracting(ex -> ((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.AI_SESSION_NOT_FOUND);
    }

    @Test
    @DisplayName("deleteSession xóa toàn bộ tin nhắn và phiên khi đúng chủ sở hữu")
    void deleteSession_success() {
        when(sessionRepository.findByIdAndUserId(existingSessionId, 100L)).thenReturn(Optional.of(existingSession));

        chatService.deleteSession(existingSessionId, 100L);

        verify(messageRepository).deleteBySessionId(existingSessionId);
        verify(sessionRepository).delete(existingSession);
    }

    @Test
    @DisplayName("AiRateLimiterService local fallback chặn khi vượt rateLimitPerMinute")
    void localRateLimiterBlocksOverLimit() {
        GeminiAiProperties rateProps = new GeminiAiProperties();
        rateProps.setRateLimitPerMinute(2);
        AiRateLimiterService localLimiter = new AiRateLimiterService(rateProps, null);

        localLimiter.checkAndConsume(77L);
        localLimiter.checkAndConsume(77L);

        assertThatThrownBy(() -> localLimiter.checkAndConsume(77L))
                .isInstanceOf(AppException.class)
                .extracting(ex -> ((AppException) ex).getErrorCode())
                .isEqualTo(ErrorCode.AI_RATE_LIMITED);
    }

    @Test
    @DisplayName("Các AI_RULE đang bật từ Admin được tiêm vào System Prompt gửi cho Gemini")
    void chat_appendsActiveAdminRulesToSystemPrompt() {
        when(sessionRepository.findFirstByUserIdAndCurrentDestinationIdOrderByUpdatedAtDesc(100L, 50L))
                .thenReturn(Optional.of(existingSession));
        when(sessionRepository.save(any(AiChatSession.class))).thenAnswer(inv -> inv.getArgument(0));
        when(messageRepository.save(any(AiChatMessage.class))).thenAnswer(inv -> {
            AiChatMessage msg = inv.getArgument(0);
            msg.setId(UUID.randomUUID());
            msg.setCreatedAt(Instant.now());
            return msg;
        });

        AiKnowledgeDocument activeRule = AiKnowledgeDocument.builder()
                .id(1L)
                .title("Quy tắc ứng xử di tích")
                .docType(AiDocumentType.AI_RULE)
                .scope(AiDocumentScope.GLOBAL)
                .rawText("Luôn nhắc du khách mặc trang phục lịch sự khi vào khu vực tâm linh.")
                .active(true)
                .build();
        when(documentRepository.findActiveRulesForChat(50L)).thenReturn(List.of(activeRule));
        when(aiRetrievalService.retrieveRelevantChunks(anyString(), eq(50L), eq(false))).thenReturn(List.of());
        when(messageRepository.findRecentMessagesAsc(existingSessionId, 8)).thenReturn(List.of());
        when(chatClient.generateReply(anyString(), anyList(), anyString(), anyDouble(), anyInt()))
                .thenReturn("Vâng, bạn nhớ lưu ý trang phục lịch sự nhé.");

        chatService.chat(100L, AiChatRequest.builder().destinationId(50L).question("Cần lưu ý gì không?").build());

        ArgumentCaptor<String> systemCaptor = ArgumentCaptor.forClass(String.class);
        verify(chatClient).generateReply(systemCaptor.capture(), anyList(), anyString(), anyDouble(), anyInt());
        assertThat(systemCaptor.getValue())
                .contains(VirtualGuidePromptTemplate.NORMAL_GUIDE_SYSTEM_PROMPT)
                .contains("Quy tắc ứng xử di tích")
                .contains("mặc trang phục lịch sự");
    }

    @Test
    @DisplayName("sanitizeAnswerFormatting loại bỏ ** **, ### nhưng giữ nguyên link [Xem tour](/tours/{id})")
    void sanitizeAnswerFormatting_removesBoldAsterisksAndPreservesTourLinks() {
        String raw = """
                ### Gợi ý điểm đến & tour
                * **Hoàng Thành Huế**: Kinh thành cổ kính.
                - Gợi ý trải nghiệm: [Xem tour: Đại Nội Huế](/tours/12)
                """;

        String cleaned = VirtualGuideChatService.sanitizeAnswerFormatting(raw);

        assertThat(cleaned)
                .doesNotContain("**")
                .doesNotContain("###")
                .contains("- Hoàng Thành Huế: Kinh thành cổ kính.")
                .contains("[Xem tour: Đại Nội Huế](/tours/12)");
    }
}
