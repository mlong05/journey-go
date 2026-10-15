package com.journeygo.modules.experience.entity.enums;

/**
 * Trạng thái vòng đời của một Experience.
 *
 * Flow (sau khi bỏ moderation):
 *   DRAFT ↔ PUBLISHED → INACTIVE (soft delete - không xóa khỏi DB)
 *
 * Lưu ý: KHÔNG còn PENDING_REVIEW/REJECTED vì moderation workflow cần chờ
 * content cultural từ module destination (text/picture/video/theme/region/artifact).
 * Khi có module destination.content + moderation, sẽ thêm lại.
 */
public enum ExperienceStatus {
    DRAFT,
    PUBLISHED,
    INACTIVE
}
