package com.journeygo.modules.journey.entity.enums;

public enum TaskProgressStatus {
    NOT_STARTED,
    IN_PROGRESS,
    COMPLETED,
    /** Hết số lần làm cho phép mà chưa trả lời đúng hết câu hỏi: không nhận điểm. */
    FAILED,
    SKIPPED
}
