package com.journeygo.config;

import com.journeygo.modules.realtime.service.RealtimeHub;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;

/**
 * Hợp đồng định tuyến WebSocket/STOMP.
 *
 * <p>⚠️ Đây là chỗ rất dễ hỏng âm thầm: Spring resolve đích {@code /user/queue/messages}
 * thành {@code /queue/messages-user<principalName>}, còn backend đẩy tin bằng
 * {@code convertAndSendToUser(<key>, "/queue/messages", …)} ⇒
 * {@code /queue/messages-user<key>}.
 *
 * <p>⇒ Hai bên PHẢI dùng CÙNG một chuỗi key. Nếu {@code Principal.getName()} trả về
 * {@code "8:tourist@…"} còn backend đẩy theo {@code "8"} ⇒ client không nhận được tin
 * nào, dù API trả 201 "thành công".
 */
@ExtendWith(MockitoExtension.class)
class WebSocketConfigRoutingTest {

    @Mock
    private SimpMessagingTemplate messagingTemplate;

    private RealtimeHub hub;

    @BeforeEach
    void setUp() {
        hub = new RealtimeHub(messagingTemplate);
    }

    /**
     * Tên principal PHẢI bằng {@code String.valueOf(userId)}.
     */
    @Test
    void principalNameIsUserIdOnly() {
        WebSocketConfig.StompPrincipal principal =
                new WebSocketConfig.StompPrincipal(8L, "tourist1@journeygo.com");

        assertEquals("8", principal.getName());
        assertEquals(8L, principal.userId());
        assertEquals("tourist1@journeygo.com", principal.email());
    }

    /**
     * Backend đẩy tin theo đúng key mà principal dùng ⇒ khớp đích.
     */
    @Test
    void backendPushUsesSameKeyAsPrincipalName() {
        WebSocketConfig.StompPrincipal principal =
                new WebSocketConfig.StompPrincipal(8L, "tourist1@journeygo.com");

        hub.sendChatMessage(8L, Map.of("body", "xin chào"));

        verify(messagingTemplate).convertAndSendToUser(
                eq(principal.getName()), eq(RealtimeHub.QUEUE_MESSAGES), any());
    }

    @Test
    void backendPushesNotificationToNotificationsQueue() {
        WebSocketConfig.StompPrincipal principal =
                new WebSocketConfig.StompPrincipal(4L, "provider@journeygo.com");

        hub.sendNotification(4L, Map.of("type", "NOTIFICATION"));

        verify(messagingTemplate).convertAndSendToUser(
                eq(principal.getName()), eq(RealtimeHub.QUEUE_NOTIFICATIONS), any());
    }

    /**
     * Người nhận rỗng ⇒ không gọi broker (tránh ném lỗi vô ích).
     */
    @Test
    void nullRecipientIsIgnored() {
        hub.sendChatMessage(null, Map.of("body", "x"));
        hub.sendNotification(null, Map.of("type", "NOTIFICATION"));

        verify(messagingTemplate, org.mockito.Mockito.never())
                .convertAndSendToUser(any(), any(), any());
    }
}
