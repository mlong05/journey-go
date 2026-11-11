package com.journeygo.modules.realtime.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

import java.util.Map;

/**
 * Đẩy sự kiện tức thời tới người dùng qua WebSocket/STOMP.
 *
 * <p>Kênh nhận (client subscribe):
 * <ul>
 *   <li>{@code /user/queue/messages} — tin nhắn chat mới (du khách ↔ đối tác).</li>
 *   <li>{@code /user/queue/notifications} — thông báo mới (đã nhận tin nhắn, duyệt tour…).</li>
 * </ul>
 *
 * <p>Payload luôn có {@code type} để client phân biệt:
 * {@code CHAT_MESSAGE}, {@code CHAT_MESSAGE_SENT}, {@code NOTIFICATION}.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class RealtimeHub {

    /** Kênh nhận tin nhắn chat. */
    public static final String QUEUE_MESSAGES = "/queue/messages";
    /** Kênh nhận thông báo. */
    public static final String QUEUE_NOTIFICATIONS = "/queue/notifications";

    /** Loại sự kiện — tin nhắn chat tới từ bên kia. */
    public static final String TYPE_CHAT_MESSAGE = "CHAT_MESSAGE";
    /** Loại sự kiện — bản tin nhắn do chính mình gửi (echo để đồng bộ nhiều thiết bị). */
    public static final String TYPE_CHAT_MESSAGE_SENT = "CHAT_MESSAGE_SENT";
    /** Loại sự kiện — thông báo mới. */
    public static final String TYPE_NOTIFICATION = "NOTIFICATION";

    private final SimpMessagingTemplate messagingTemplate;

    /**
     * Gửi tin nhắn chat tới một người nhận cụ thể.
     *
     * @param recipientUserId người nhận (du khách hoặc đối tác)
     * @param payload         payload gửi kèm (conversationId, body, senderId, …)
     */
    public void sendChatMessage(Long recipientUserId, Map<String, Object> payload) {
        if (recipientUserId == null) return;
        try {
            messagingTemplate.convertAndSendToUser(
                    String.valueOf(recipientUserId), QUEUE_MESSAGES, payload);
        } catch (Exception ex) {
            log.warn("[Realtime] Không gửi được tin nhắn tới user {}: {}", recipientUserId, ex.getMessage());
        }
    }

    /** Gửi thông báo tới một người dùng. */
    public void sendNotification(Long recipientUserId, Map<String, Object> payload) {
        if (recipientUserId == null) return;
        try {
            messagingTemplate.convertAndSendToUser(
                    String.valueOf(recipientUserId), QUEUE_NOTIFICATIONS, payload);
        } catch (Exception ex) {
            log.warn("[Realtime] Không gửi được thông báo tới user {}: {}", recipientUserId, ex.getMessage());
        }
    }
}
