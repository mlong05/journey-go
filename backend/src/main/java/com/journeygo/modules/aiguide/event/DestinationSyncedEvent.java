package com.journeygo.modules.aiguide.event;

/**
 * Sự kiện phát ra khi một Điểm đến được phê duyệt / phát hành để tự động cập nhật Vector Store.
 */
public record DestinationSyncedEvent(
        Long destinationId,
        String name,
        String description,
        String address
) {
}
