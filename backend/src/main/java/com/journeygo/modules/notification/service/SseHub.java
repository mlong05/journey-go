package com.journeygo.modules.notification.service;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.MediaType;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Giữ các kết nối SSE đang mở theo người dùng (một người có thể mở nhiều tab / thiết bị).
 *
 * <p>Lưu trong bộ nhớ nên chỉ đúng khi backend chạy một instance. Khi chạy nhiều instance,
 * phát sự kiện qua Redis Pub/Sub rồi mỗi instance gọi {@link #send} cho kết nối của mình.
 */
@Slf4j
@Component
public class SseHub {

    /** Hết hạn sau 30 phút; client tự kết nối lại (và nhận lại số chưa đọc). */
    private static final long TIMEOUT_MS = 30 * 60 * 1000L;

    private final Map<Long, List<SseEmitter>> emitters = new ConcurrentHashMap<>();

    public SseEmitter register(Long userId) {
        SseEmitter emitter = new SseEmitter(TIMEOUT_MS);
        emitters.computeIfAbsent(userId, id -> new CopyOnWriteArrayList<>()).add(emitter);
        Runnable remove = () -> remove(userId, emitter);
        emitter.onCompletion(remove);
        emitter.onTimeout(remove);
        emitter.onError(e -> remove.run());
        return emitter;
    }

    public void send(Long userId, String eventName, Object data) {
        List<SseEmitter> list = emitters.get(userId);
        if (list == null) return;
        for (SseEmitter emitter : list) {
            try {
                emitter.send(SseEmitter.event().name(eventName).data(data, MediaType.APPLICATION_JSON));
            } catch (IOException | IllegalStateException e) {
                // Client đã đóng tab / mất mạng
                remove(userId, emitter);
            }
        }
    }

    public boolean isOnline(Long userId) {
        List<SseEmitter> list = emitters.get(userId);
        return list != null && !list.isEmpty();
    }

    /** Nhịp giữ kết nối: proxy / trình duyệt hay cắt kết nối im lặng quá lâu. */
    @Scheduled(fixedRate = 25_000)
    public void heartbeat() {
        emitters.forEach((userId, list) -> {
            for (SseEmitter emitter : list) {
                try {
                    emitter.send(SseEmitter.event().comment("ping"));
                } catch (IOException | IllegalStateException e) {
                    remove(userId, emitter);
                }
            }
        });
    }

    private void remove(Long userId, SseEmitter emitter) {
        emitters.computeIfPresent(userId, (id, list) -> {
            list.remove(emitter);
            return list.isEmpty() ? null : list;
        });
    }
}
