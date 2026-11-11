package com.journeygo.config;

import com.journeygo.security.JwtTokenProvider;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.config.ChannelRegistration;
import org.springframework.messaging.simp.config.MessageBrokerRegistry;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker;
import org.springframework.web.socket.config.annotation.StompEndpointRegistry;
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer;

import java.security.Principal;

/**
 * Cấu hình WebSocket/STOMP cho chat tức thời.
 *
 * <p>─── Giao thức ───
 * <ul>
 *   <li>Endpoint: {@code /ws} (WebSocket thuần, không dùng SockJS).</li>
 *   <li>Client gửi header {@code Authorization: Bearer <token>} khi bắt tay (STOMP CONNECT).</li>
 *   <li>Server xác thực token rồi gắn {@link Principal} = {@code StompPrincipal(userId, email)}
 *       (tên principal CHỈ là userId — xem giải thích ở {@link StompPrincipal#getName()}).</li>
 *   <li>Kênh nhận tin nhắn riêng: {@code /user/queue/messages} và {@code /user/queue/notifications}.</li>
 * </ul>
 *
 * <p>─── Vì sao không dùng SSE cho chat? ───
 * SSE chỉ đẩy được backend → client, không đẩy được client → backend. Chat cần cả hai
 * chiều (gửi tin nhắn, phản hồi tức thì) nên dùng WebSocket/STOMP.
 */
@Slf4j
@Configuration
@EnableWebSocketMessageBroker
@RequiredArgsConstructor
public class WebSocketConfig implements WebSocketMessageBrokerConfigurer {

    private final JwtTokenProvider tokenProvider;

    @Value("${app.websocket.allowed-origins:*}")
    private String allowedOrigins;

    @Override
    public void configureMessageBroker(MessageBrokerRegistry registry) {
        // Broker đơn giản trong bộ nhớ — đủ cho một instance. Khi chạy nhiều instance thì
        // chuyển sang broker ngoài (RabbitMQ/ActiveMQ) qua `setBrokerRelay`.
        registry.enableSimpleBroker("/queue", "/topic");
        // Đích theo người dùng: /user/queue/messages ⇒ /queue/messages-user{userId}
        registry.setUserDestinationPrefix("/user");
    }

    @Override
    public void registerStompEndpoints(StompEndpointRegistry registry) {
        registry.addEndpoint("/ws")
                .setAllowedOriginPatterns(allowedOrigins.split(","));
    }

    @Override
    public void configureClientInboundChannel(ChannelRegistration registration) {
        registration.interceptors(new JwtStompInterceptor());
    }

    /**
     * Xác thực JWT ở bước CONNECT. Nếu token không hợp lệ ⇒ chặn kết nối
     * (client phải làm mới token rồi kết nối lại).
     */
    private final class JwtStompInterceptor implements ChannelInterceptor {

        @Override
        public Message<?> preSend(Message<?> message, MessageChannel channel) {
            StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
            if (accessor == null) return message;

            if (StompCommand.CONNECT.equals(accessor.getCommand())) {
                String token = resolveToken(accessor);
                if (token == null || !tokenProvider.validateToken(token)) {
                    log.warn("[WebSocket] Từ chối kết nối: token không hợp lệ");
                    throw new org.springframework.messaging.MessagingException("Access token không hợp lệ");
                }
                try {
                    String email = tokenProvider.getUsernameFromToken(token);
                    Long userId = tokenProvider.getUserIdFromToken(token);
                    if (userId == null) {
                        log.warn("[WebSocket] Token không có claim userId");
                        throw new org.springframework.messaging.MessagingException("Access token không hợp lệ");
                    }
                    accessor.setUser(new StompPrincipal(userId, email));
                    log.debug("[WebSocket] Kết nối mới: user={}", email);
                } catch (org.springframework.messaging.MessagingException ex) {
                    throw ex;
                } catch (Exception ex) {
                    log.warn("[WebSocket] Không đọc được claims của token: {}", ex.getMessage());
                    throw new org.springframework.messaging.MessagingException("Access token không hợp lệ");
                }
            }
            return message;
        }

        private String resolveToken(StompHeaderAccessor accessor) {
            String nativeHeader = accessor.getFirstNativeHeader("Authorization");
            if (nativeHeader != null && nativeHeader.startsWith("Bearer ")) {
                return nativeHeader.substring(7);
            }
            // STOMP client (mobile) đưa token qua header `access_token` vì một số client
            // không cho gắn header Authorization trong CONNECT.
            String alt = accessor.getFirstNativeHeader("access_token");
            if (alt != null && !alt.isBlank()) {
                return alt.trim();
            }
            return null;
        }
    }

    /**
     * Principal mang id + email của người đang kết nối.
     *
     * <p>⚠️ Vì sao {@link #getName()} trả về CHỈ userId?
     * Spring resolve đích {@code /user/queue/messages} thành
     * {@code /queue/messages-user<principalName>}. Backend đẩy tin bằng
     * {@code convertAndSendToUser(userId, ...)} ⇒ tên principal PHẢI đúng bằng userId,
     * nếu không sẽ không khớp và client không nhận được tin.
     * Email vẫn giữ trong record (dùng để log), chỉ không nằm trong tên principal.
     */
    public record StompPrincipal(Long userId, String email) implements Principal {
        @Override
        public String getName() {
            return String.valueOf(userId);
        }
    }
}
