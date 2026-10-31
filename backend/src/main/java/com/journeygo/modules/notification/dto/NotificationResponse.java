package com.journeygo.modules.notification.dto;

import com.journeygo.modules.notification.entity.Notification;
import com.journeygo.modules.notification.entity.enums.NotificationType;

import java.time.Instant;

public record NotificationResponse(
        Long id,
        NotificationType type,
        NotificationType.Category category,
        String title,
        String body,
        String link,
        String refType,
        Long refId,
        boolean read,
        Instant createdAt
) {
    public static NotificationResponse fromEntity(Notification n) {
        return new NotificationResponse(n.getId(), n.getType(), n.getType().getCategory(), n.getTitle(),
                n.getBody(), n.getLink(), n.getRefType(), n.getRefId(), n.getReadAt() != null, n.getCreatedAt());
    }
}
