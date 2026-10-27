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
    MAIL_SEND_FAILED("Gửi email thất bại, vui lòng kiểm tra lại cấu hình hoặc thử lại sau", HttpStatus.INTERNAL_SERVER_ERROR),
    CANNOT_MODIFY_OWN_ROLE("Không thể tự thay đổi vai trò của chính mình", HttpStatus.BAD_REQUEST),
    CANNOT_DEACTIVATE_SELF("Không thể tự khóa tài khoản của chính mình", HttpStatus.BAD_REQUEST),
    REGION_NOT_FOUND("Khu vực không tồn tại", HttpStatus.NOT_FOUND),
    REGION_EXISTED("Khu vực đã tồn tại", HttpStatus.CONFLICT),
    THEME_NOT_FOUND("Chủ đề không tồn tại", HttpStatus.NOT_FOUND),
    THEME_EXISTED("Chủ đề đã tồn tại", HttpStatus.CONFLICT),
    CONTENT_NOT_FOUND("Nội dung văn hóa không tồn tại", HttpStatus.NOT_FOUND),
    INVALID_DESTINATION_STATUS("Trạng thái điểm đến không hợp lệ cho thao tác này", HttpStatus.BAD_REQUEST),
    TOUR_NOT_FOUND("Tour không tồn tại", HttpStatus.NOT_FOUND),
    TOUR_EXISTED("Tour với tên này đã tồn tại", HttpStatus.CONFLICT),
    TOUR_REJECTION_REASON_REQUIRED("Lý do từ chối không được để trống", HttpStatus.BAD_REQUEST),
    INVALID_TOUR_STATUS("Trạng thái tour không hợp lệ cho thao tác này", HttpStatus.BAD_REQUEST),
    ROLE_NOT_FOUND("Vai trò không tồn tại trong hệ thống", HttpStatus.NOT_FOUND),
    ROLE_EXISTED("Vai trò này đã tồn tại trong hệ thống", HttpStatus.CONFLICT),
    CANNOT_DEACTIVATE_ADMIN("Không thể vô hiệu hóa tài khoản của quản trị viên khác", HttpStatus.FORBIDDEN),
    CONTENT_REVIEW_REASON_REQUIRED("Lý do từ chối nội dung không được để trống", HttpStatus.BAD_REQUEST),
    INVALID_CONTENT_REVIEW_STATUS("Trạng thái kiểm duyệt nội dung không hợp lệ cho thao tác này", HttpStatus.BAD_REQUEST),
    CLOUDINARY_NOT_CONFIGURED("Cloudinary chưa được cấu hình trên máy chủ", HttpStatus.SERVICE_UNAVAILABLE),
    INVALID_CLOUDINARY_ASSET("Ảnh Cloudinary không hợp lệ hoặc không thuộc tài khoản hiện tại", HttpStatus.BAD_REQUEST);

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
