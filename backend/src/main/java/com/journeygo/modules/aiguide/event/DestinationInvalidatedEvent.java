package com.journeygo.modules.aiguide.event;

/**
 * Sự kiện phát ra khi Điểm đến bị sửa (chờ duyệt lại), thu hồi duyệt hoặc xóa mềm.
 *
 * @param removeAllDestinationChunks true = xóa sạch toàn bộ tri thức thuộc địa điểm (khi xóa mềm),
 *                                   false = chỉ xóa bản tóm tắt {@code DESTINATION:<id>} để chờ duyệt lại.
 */
public record DestinationInvalidatedEvent(
        Long destinationId,
        String reason,
        boolean removeAllDestinationChunks
) {
}
