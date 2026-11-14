package com.journeygo.modules.notification.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.notification.dto.NotificationResponse;
import com.journeygo.modules.notification.entity.Notification;
import com.journeygo.modules.notification.event.NotificationEvent;
import com.journeygo.modules.notification.repository.NotificationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationService {

    /** Tên sự kiện SSE — web và app lắng nghe đúng các tên này. */
    public static final String EVENT_NOTIFICATION = "notification";
    public static final String EVENT_UNREAD = "unread-count";
    public static final String EVENT_QUEUE = "queue-changed";

    private final NotificationRepository repository;
    private final SseHub hub;
    private final com.journeygo.modules.realtime.service.RealtimeHub realtimeHub;

    // ── Gửi ──────────────────────────────────────────────────────────────────

    /** Lưu thông báo cho từng người nhận rồi đẩy tới người đang online. Chạy sau khi giao dịch nghiệp vụ commit. */
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void deliver(NotificationEvent event) {
        Set<Long> recipients = resolveRecipients(event.recipientIds(), event.recipientRole(), event.excludeUserId());
        if (recipients.isEmpty()) return;

        List<Notification> saved = new ArrayList<>(recipients.size());
        for (Long userId : recipients) {
            saved.add(Notification.builder()
                    .recipientId(userId)
                    .type(event.type())
                    .title(event.title())
                    .body(event.body())
                    .link(event.link())
                    .refType(event.refType())
                    .refId(event.refId())
                    .build());
        }
        repository.saveAll(saved);

        for (Notification n : saved) {
            Long userId = n.getRecipientId();
            // WebSocket: thông báo tới thiết bị đang mở app (mobile/web) ngay lập tức.
            realtimeHub.sendNotification(userId, Map.of(
                    "type", com.journeygo.modules.realtime.service.RealtimeHub.TYPE_NOTIFICATION,
                    "notification", NotificationResponse.fromEntity(n)));
            if (!hub.isOnline(userId)) continue;
            hub.send(userId, EVENT_NOTIFICATION, NotificationResponse.fromEntity(n));
            hub.send(userId, EVENT_UNREAD, Map.of("count", repository.countByRecipientIdAndReadAtIsNull(userId)));
            if (event.queue() != null) hub.send(userId, EVENT_QUEUE, Map.of("queue", event.queue()));
        }
        log.debug("[Notification] {} → {} người nhận", event.type(), saved.size());
    }

    /** Chỉ báo hàng chờ đổi cho người đang online thuộc vai trò, không lưu gì. */
    @Transactional(readOnly = true)
    public void pushQueueChanged(String role, String queue) {
        for (Long userId : repository.findActiveUserIdsByRole(role)) {
            if (hub.isOnline(userId)) hub.send(userId, EVENT_QUEUE, Map.of("queue", queue));
        }
    }

    private Set<Long> resolveRecipients(Set<Long> ids, String role, Long exclude) {
        Set<Long> result = new LinkedHashSet<>();
        if (ids != null) result.addAll(ids);
        if (role != null) result.addAll(repository.findActiveUserIdsByRole(role));
        if (exclude != null) result.remove(exclude);
        return result;
    }

    // ── Đọc ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public PageResponse<NotificationResponse> getMine(Long userId, boolean unreadOnly, Pageable pageable) {
        var page = unreadOnly
                ? repository.findByRecipientIdAndReadAtIsNullOrderByCreatedAtDesc(userId, pageable)
                : repository.findByRecipientIdOrderByCreatedAtDesc(userId, pageable);
        return PageResponse.from(page, NotificationResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public long unreadCount(Long userId) {
        return repository.countByRecipientIdAndReadAtIsNull(userId);
    }

    @Transactional
    public long markRead(Long id, Long userId) {
        Notification n = repository.findByIdAndRecipientId(id, userId)
                .orElseThrow(() -> new AppException(ErrorCode.NOTIFICATION_NOT_FOUND));
        if (n.getReadAt() == null) {
            n.setReadAt(Instant.now());
            repository.save(n);
        }
        return broadcastUnread(userId);
    }

    @Transactional
    public long markAllRead(Long userId) {
        repository.markAllRead(userId, Instant.now());
        return broadcastUnread(userId);
    }

    /** Đồng bộ số chưa đọc sang các tab / thiết bị khác của cùng người dùng. */
    private long broadcastUnread(Long userId) {
        long count = repository.countByRecipientIdAndReadAtIsNull(userId);
        hub.send(userId, EVENT_UNREAD, Map.of("count", count));
        return count;
    }
}
