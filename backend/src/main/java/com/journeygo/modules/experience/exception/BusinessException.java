package com.journeygo.modules.experience.exception;

import lombok.Getter;

/**
 * Exception nghiệp vụ do Service ném khi vi phạm một Business Rule (BR-EXP, BR-TASK, …).
 *
 * Xử lý bởi {@link com.journeygo.common.exception.GlobalExceptionHandler} - trả về
 * HTTP 400 Bad Request với message thân thiện.
 *
 * Ví dụ: BR-TASK-3 (QUIZ phải có ≥1 Question), BR-EXP-1 (1 Destination chỉ có 1 Experience).
 */
@Getter
public class BusinessException extends RuntimeException {

    /** Mã lỗi nghiệp vụ, ví dụ: "BR-EXP-1", "BR-TASK-3". */
    private final String code;

    public BusinessException(String code, String message) {
        super(message);
        this.code = code;
    }
}