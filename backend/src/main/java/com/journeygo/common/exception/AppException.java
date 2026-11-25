package com.journeygo.common.exception;

public class AppException extends RuntimeException {
    private final ErrorCode errorCode;

    /** true khi nơi ném lỗi tự viết câu thông báo (thường là tiếng Việt, chi tiết hơn mã lỗi). */
    private final boolean customMessage;

    public AppException(ErrorCode errorCode) {
        super(errorCode.getMessage());
        this.errorCode = errorCode;
        this.customMessage = false;
    }

    public AppException(ErrorCode errorCode, String customMessage) {
        super(customMessage);
        this.errorCode = errorCode;
        this.customMessage = customMessage != null && !customMessage.isBlank();
    }

    public ErrorCode getErrorCode() {
        return errorCode;
    }

    public boolean hasCustomMessage() {
        return customMessage;
    }
}
