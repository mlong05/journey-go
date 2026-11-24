package com.journeygo.modules.aiguide.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.modules.aiguide.dto.AdminStaffReplyRequest;
import com.journeygo.modules.aiguide.dto.AiChatMessageDto;
import com.journeygo.modules.aiguide.dto.AiChatSessionDto;
import com.journeygo.modules.aiguide.service.VirtualGuideChatService;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.security.UserPrincipal;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.authority.SimpleGrantedAuthority;

import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AdminAiHandoffControllerTest {

    @Mock
    private VirtualGuideChatService virtualGuideChatService;

    @InjectMocks
    private AdminAiHandoffController controller;

    @Test
    void listSessions_clampsPageAndDelegates() {
        AiChatSessionDto dto = AiChatSessionDto.builder().id(UUID.randomUUID()).handoffStatus("WAITING_HUMAN").build();
        when(virtualGuideChatService.getAdminHandoffSessions(eq("WAITING_HUMAN"), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(dto)));

        ResponseEntity<ApiResponse<PageResponse<AiChatSessionDto>>> res =
                controller.listSessions("WAITING_HUMAN", -2, 100);

        assertThat(res.getStatusCode().value()).isEqualTo(200);
        assertThat(res.getBody().getData().getContent()).hasSize(1);
        verify(virtualGuideChatService).getAdminHandoffSessions(eq("WAITING_HUMAN"), any(Pageable.class));
    }

    @Test
    void replySession_resolvesAdminAndModeratorRolesCorrectly() {
        UUID sid = UUID.randomUUID();
        UserPrincipal admin = new UserPrincipal(
                1L, "admin@journeygo.com", "pw", "Quản trị viên", true,
                List.of(new SimpleGrantedAuthority("ROLE_ADMIN"))
        );
        UserPrincipal moderator = new UserPrincipal(
                3L, "mod@journeygo.com", "pw", "Mod Lan", true,
                List.of(new SimpleGrantedAuthority("ROLE_CONTENT_MODERATOR"))
        );

        AiChatMessageDto adminReply = AiChatMessageDto.builder().role("HUMAN_AGENT").senderRole(Role.ADMIN).build();
        AiChatMessageDto modReply = AiChatMessageDto.builder().role("HUMAN_AGENT").senderRole(Role.CONTENT_MODERATOR).build();

        when(virtualGuideChatService.sendStaffReply(sid, 1L, "Quản trị viên", Role.ADMIN, "Chào bạn"))
                .thenReturn(adminReply);
        when(virtualGuideChatService.sendStaffReply(sid, 3L, "Mod Lan", Role.CONTENT_MODERATOR, "Mod hỗ trợ"))
                .thenReturn(modReply);

        ResponseEntity<ApiResponse<AiChatMessageDto>> r1 = controller.replySession(
                admin, sid, AdminStaffReplyRequest.builder().content("Chào bạn").build());
        ResponseEntity<ApiResponse<AiChatMessageDto>> r2 = controller.replySession(
                moderator, sid, AdminStaffReplyRequest.builder().content("Mod hỗ trợ").build());

        assertThat(r1.getBody().getData().getSenderRole()).isEqualTo(Role.ADMIN);
        assertThat(r2.getBody().getData().getSenderRole()).isEqualTo(Role.CONTENT_MODERATOR);
    }
}
