package com.journeygo.modules.experience.entity.enums;

/**
 * Trạng thái vòng đời của một Task con trong Experience.
 *
 * Flow (sau khi bỏ moderation):
 *   DRAFT ↔ PUBLISHED → INACTIVE
 *
 * Lưu ý: KHÔNG còn PENDING_REVIEW/REJECTED vì moderation workflow cần chờ
 * content cultural từ module destination. Khi có sẽ thêm lại.
 */
public enum TaskStatus {
    DRAFT,
    PUBLISHED,
    INACTIVE
}
