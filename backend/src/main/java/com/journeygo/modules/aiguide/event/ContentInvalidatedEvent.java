package com.journeygo.modules.aiguide.event;

/**
 * Sự kiện phát ra khi một nội dung văn hóa bị sửa, bị xóa mềm, hoặc bị từ chối duyệt.
 * Dùng để thu hồi (xóa) vector cũ ra khỏi Vector Store.
 */
public record ContentInvalidatedEvent(
        Long contentId,
        String reason
) {}

