package com.journeygo.modules.experience.entity.enums;

/**
 * Loại điều kiện mở khóa (unlock condition) cho Task.
 *
 * Theo CONTEXT §3.2 mới:
 *   - SEQUENTIAL: phải hoàn thành prerequisite_task trước.
 *   - SCORE_BASED: đạt minimum_score_percent từ task trước.
 *   - TIME_BASED: sau khoảng time_window_minutes kể từ experience bắt đầu.
 *   - LOCATION_VERIFICATION: Tourist phải đang ở vị trí hợp lệ (trong bán kính CIP)
 *     mới được phép bắt đầu/trả lời Real-world Interactive task.
 *   - NONE: luôn mở (mặc định).
 *
 * Logic kiểm tra runtime thuộc module Tourist Execution (chưa build) — module này chỉ cấu hình.
 */
public enum UnlockConditionType {
    SEQUENTIAL,
    SCORE_BASED,
    TIME_BASED,
    LOCATION_VERIFICATION,
    NONE
}
