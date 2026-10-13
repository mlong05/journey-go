package com.journeygo.common.exception;

import org.springframework.http.HttpStatus;

public enum ErrorCode {
    UNCATEGORIZED_EXCEPTION("Lỗi hệ thống không xác định", HttpStatus.INTERNAL_SERVER_ERROR),
    INVALID_KEY("Khóa không hợp lệ", HttpStatus.BAD_REQUEST),
    USER_EXISTED("Người dùng hoặc email đã tồn tại", HttpStatus.CONFLICT),
    USER_NOT_EXISTED("Người dùng không tồn tại", HttpStatus.NOT_FOUND),
    UNAUTHENTICATED("Chưa xác thực hoặc thông tin đăng nhập không chính xác", HttpStatus.UNAUTHORIZED),
    UNAUTHORIZED("Bạn không có quyền truy cập tài nguyên này", HttpStatus.FORBIDDEN),
    INVALID_CREDENTIALS("Email hoặc mật khẩu không chính xác", HttpStatus.UNAUTHORIZED),
    INVALID_TOKEN("Token không hợp lệ hoặc đã hết hạn", HttpStatus.UNAUTHORIZED),
    REFRESH_TOKEN_EXPIRED("Refresh token đã hết hạn, vui lòng đăng nhập lại", HttpStatus.UNAUTHORIZED),
    REFRESH_TOKEN_NOT_FOUND("Refresh token không tồn tại trong hệ thống", HttpStatus.NOT_FOUND),
    VALIDATION_ERROR("Dữ liệu đầu vào không hợp lệ", HttpStatus.BAD_REQUEST),
    DESTINATION_NOT_FOUND("Điểm đến không tồn tại", HttpStatus.NOT_FOUND),
    DESTINATION_EXISTED("Điểm đến với tên và địa chỉ này đã tồn tại", HttpStatus.CONFLICT),
    DESTINATION_COORDINATE_EXISTED("Đã tồn tại điểm đến với tọa độ này", HttpStatus.CONFLICT),
    INVALID_OTP("Mã OTP không chính xác hoặc đã được sử dụng", HttpStatus.BAD_REQUEST),
    OTP_EXPIRED("Mã OTP đã hết hạn, vui lòng yêu cầu mã mới", HttpStatus.BAD_REQUEST),
    PASSWORD_NOT_MATCH("Mật khẩu xác nhận không trùng khớp", HttpStatus.BAD_REQUEST),
    SAME_OLD_PASSWORD("Mật khẩu mới không được trùng với mật khẩu hiện tại", HttpStatus.BAD_REQUEST),
    MAIL_SEND_FAILED("Gửi email thất bại, vui lòng kiểm tra lại cấu hình hoặc thử lại sau", HttpStatus.INTERNAL_SERVER_ERROR);

    private final String message;
    private final HttpStatus httpStatus;

    ErrorCode(String message, HttpStatus httpStatus) {
        this.message = message;
        this.httpStatus = httpStatus;
    }

    public String getMessage() {
        return message;
    }

    public HttpStatus getHttpStatus() {
        return httpStatus;
    }
}
