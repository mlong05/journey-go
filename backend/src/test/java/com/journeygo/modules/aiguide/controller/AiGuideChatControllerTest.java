package com.journeygo.modules.aiguide.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.aiguide.dto.AiChatMessageDto;
import com.journeygo.modules.aiguide.dto.AiChatRequest;
import com.journeygo.modules.aiguide.dto.AiChatResponse;
import com.journeygo.modules.aiguide.dto.AiChatSessionDto;
import com.journeygo.modules.aiguide.service.VirtualGuideChatService;
import com.journeygo.security.UserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AiGuideChatControllerTest {

    @Mock
    private VirtualGuideChatService virtualGuideChatService;

    @InjectMocks
    private AiGuideChatController controller;

    private UserPrincipal touristPrincipal;

    @BeforeEach
    void setUp() {
        touristPrincipal = new UserPrincipal(
                100L,
                "tourist@journeygo.com",
                "secret",
                "Tourist",
                true,
                List.of(new SimpleGrantedAuthority("ROLE_TOURIST"))
        );
    }

    @Test
    @DisplayName("POST /chat chuyển đúng userId và request cho VirtualGuideChatService")
    void chat_returnsOkResponse() {
        UUID sessionId = UUID.randomUUID();
        AiChatRequest request = AiChatRequest.builder()
                .sessionId(sessionId)
                .destinationId(50L)
                .question("Chùa Một Cột có ý nghĩa gì?")
                .build();

        AiChatResponse reply = AiChatResponse.builder()
                .sessionId(sessionId)
                .messageId(UUID.randomUUID())
                .answer("Biểu tượng bông sen...")
                .mode("NORMAL_GUIDE")
                .citations(List.of("Chùa Một Cột"))
                .createdAt(Instant.now())
                .build();

        when(virtualGuideChatService.chat(100L, request)).thenReturn(reply);

        ResponseEntity<ApiResponse<AiChatResponse>> res = controller.chat(touristPrincipal, request);

        assertThat(res.getStatusCode().value()).isEqualTo(200);
        assertThat(res.getBody()).isNotNull();
        assertThat(res.getBody().getData().getAnswer()).contains("bông sen");
        assertThat(res.getBody().getData().getCitations()).containsExactly("Chùa Một Cột");
    }

    @Test
    @DisplayName("POST /sessions truyền đúng forceNew flag")
    void createOrGetSession_passesForceNew() {
        UUID sessionId = UUID.randomUUID();
        AiChatSessionDto session = AiChatSessionDto.builder().id(sessionId).userId(100L).currentDestinationId(50L).build();
        when(virtualGuideChatService.getOrCreateSession(100L, 50L, true)).thenReturn(session);

        ResponseEntity<ApiResponse<AiChatSessionDto>> res = controller.createOrGetSession(touristPrincipal, 50L, true);

        assertThat(res.getStatusCode().value()).isEqualTo(200);
        assertThat(res.getBody().getData().getId()).isEqualTo(sessionId);
        verify(virtualGuideChatService).getOrCreateSession(100L, 50L, true);
    }

    @Test
    @DisplayName("GET /sessions giới hạn size tối đa 50")
    void getUserSessions_clampsSizeToMax50() {
        when(virtualGuideChatService.getUserSessions(eq(100L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        ResponseEntity<ApiResponse<PageResponse<AiChatSessionDto>>> res =
                controller.getUserSessions(touristPrincipal, -1, 500);

        assertThat(res.getStatusCode().value()).isEqualTo(200);
        ArgumentCaptor<Pageable> pageableCaptor = ArgumentCaptor.forClass(Pageable.class);
        verify(virtualGuideChatService).getUserSessions(eq(100L), pageableCaptor.capture());
        assertThat(pageableCaptor.getValue().getPageNumber()).isEqualTo(0);
        assertThat(pageableCaptor.getValue().getPageSize()).isEqualTo(50);
    }

    @Test
    @DisplayName("GET /sessions/{id}/messages trả về lịch sử tin nhắn")
    void getSessionMessages_returnsList() {
        UUID sessionId = UUID.randomUUID();
        AiChatMessageDto msg = AiChatMessageDto.builder().id(UUID.randomUUID()).sessionId(sessionId).role("USER").content("Hi").build();
        when(virtualGuideChatService.getSessionMessages(sessionId, 100L)).thenReturn(List.of(msg));

        ResponseEntity<ApiResponse<List<AiChatMessageDto>>> res = controller.getSessionMessages(touristPrincipal, sessionId);

        assertThat(res.getStatusCode().value()).isEqualTo(200);
        assertThat(res.getBody().getData()).hasSize(1);
    }

    @Test
    @DisplayName("DELETE /sessions/{id} gọi deleteSession đúng userId")
    void deleteSession_callsService() {
        UUID sessionId = UUID.randomUUID();

        ResponseEntity<ApiResponse<Void>> res = controller.deleteSession(touristPrincipal, sessionId);

        assertThat(res.getStatusCode().value()).isEqualTo(200);
        verify(virtualGuideChatService).deleteSession(sessionId, 100L);
    }
}
