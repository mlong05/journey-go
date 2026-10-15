package com.journeygo.modules.experience.entity.enums;

/**
 * Loại câu hỏi trong Task.
 *
 * - MULTIPLE_CHOICE: có nhiều answer, đúng 1 is_correct=true.
 * - TEXT: có 0 hoặc nhiều answer, tất cả is_correct=true (mỗi answer là 1 cách viết được chấp nhận).
 *              Đáp án chính cũng được lưu ở question.expected_text (BR-TASK-6).
 */
public enum QuestionType {
    MULTIPLE_CHOICE,
    TEXT
}