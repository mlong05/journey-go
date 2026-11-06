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
    LOGIN_RATE_LIMITED("Bạn đã nhập sai mật khẩu quá nhiều lần. Vui lòng thử lại sau 5 phút.", HttpStatus.TOO_MANY_REQUESTS),
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
    INVALID_CLOUDINARY_ASSET("Ảnh Cloudinary không hợp lệ hoặc không thuộc tài khoản hiện tại", HttpStatus.BAD_REQUEST),
    GEOCODING_NOT_CONFIGURED("Dịch vụ bản đồ Goong chưa được cấu hình trên máy chủ", HttpStatus.SERVICE_UNAVAILABLE),
    GEOCODING_UNAVAILABLE("Không lấy được dữ liệu bản đồ từ Goong, vui lòng thử lại", HttpStatus.BAD_GATEWAY),

    // ── Booking ───────────────────────────────────────────────────────────────
    BOOKING_NOT_FOUND("Booking không tồn tại", HttpStatus.NOT_FOUND),
    BOOKING_TOUR_NOT_AVAILABLE("Tour chưa được xuất bản — không thể đặt", HttpStatus.BAD_REQUEST),
    BOOKING_INVALID_DATE("Ngày trải nghiệm không hợp lệ", HttpStatus.BAD_REQUEST),
    BOOKING_SLOT_NOT_FOUND("Chưa mở bán trải nghiệm cho ngày này", HttpStatus.BAD_REQUEST),
    BOOKING_SLOT_FULL("Trải nghiệm đã hết chỗ cho ngày này", HttpStatus.CONFLICT),
    BOOKING_NO_AVAILABLE_EXPERIENCE("Tour không có trải nghiệm khả dụch để đặt", HttpStatus.BAD_REQUEST),
    BOOKING_ALREADY_EXPIRED("Booking đã hết hạn thanh toán", HttpStatus.CONFLICT),
    BOOKING_CANNOT_CANCEL_PAID("Booking đã thanh toán — không thể hủy trực tiếp", HttpStatus.CONFLICT),
    BOOKING_INVALID_STATUS_FOR_CANCEL("Trạng thái Booking không cho phép hủy", HttpStatus.CONFLICT),

    // ── Payment ───────────────────────────────────────────────────────────────
    PAYMENT_NOT_FOUND("Giao dịch thanh toán không tồn tại", HttpStatus.NOT_FOUND),
    PAYMENT_NOT_RETRYABLE("Giao dịch trước chưa rõ kết quả — cần xác minh trước khi thử lại", HttpStatus.CONFLICT),
    PAYMENT_ALREADY_SUCCEEDED("Booking đã được thanh toán thành công", HttpStatus.CONFLICT),
    PAYMENT_AMOUNT_MISMATCH("Số tiền thanh toán không khớp với đơn hàng", HttpStatus.BAD_REQUEST),
    PAYMENT_INVALID_SIGNATURE("Chữ ký thanh toán không hợp lệ", HttpStatus.BAD_REQUEST),
    PAYMENT_NOT_CONFIRMED("Giao dịch thanh toán chưa được xác nhận thành công", HttpStatus.CONFLICT),

    // ── Refund ────────────────────────────────────────────────────────────────
    REFUND_NOT_FOUND("Yêu cầu hoàn tiền không tồn tại", HttpStatus.NOT_FOUND),
    REFUND_PAYMENT_NOT_SUCCESS("Chỉ được hoàn tiền cho giao dịch đã thanh toán thành công", HttpStatus.BAD_REQUEST),
    REFUND_WINDOW_EXPIRED("Đã quá thời hạn 24 giờ để gửi yêu cầu hoàn tiền", HttpStatus.BAD_REQUEST),
    REFUND_ALREADY_EXISTS("Giao dịch này đã có yêu cầu hoàn tiền đang xử lý hoặc đã hoàn tất", HttpStatus.CONFLICT),
    REFUND_EXCEEDS_PAYMENT_AMOUNT("Tổng số tiền hoàn vượt quá số tiền thanh toán", HttpStatus.BAD_REQUEST),
    REFUND_AMOUNT_MISMATCH("Số tiền hoàn không khớp chính sách theo nguyên nhân", HttpStatus.BAD_REQUEST),
    REFUND_INVALID_STATUS("Trạng thái yêu cầu hoàn tiền không cho phép thao tác này", HttpStatus.CONFLICT),
    REFUND_METHOD_NOT_ALLOWED("Chưa xác minh được trạng thái VNPay — không thể chuyển sang phương thức thủ công", HttpStatus.CONFLICT),
    REFUND_BANK_INFO_REQUIRED("Thiếu thông tin tài khoản nhận tiền cho chuyển khoản thủ công", HttpStatus.BAD_REQUEST),

    // ── Partner / Revenue ─────────────────────────────────────────────────────
    PARTNER_NOT_FOUND("Đối tác không tồn tại", HttpStatus.NOT_FOUND),
    PARTNER_ALREADY_EXISTS("Người dùng này đã là đối tác", HttpStatus.CONFLICT),
    PARTNER_REVENUE_NOT_FOUND("Bản ghi doanh thu không tồn tại", HttpStatus.NOT_FOUND),

    // ── Wallet / Settlement ───────────────────────────────────────────────────
    WALLET_NOT_FOUND("Ví của đối tác không tồn tại", HttpStatus.NOT_FOUND),
    WALLET_TRANSACTION_NOT_FOUND("Giao dịch ví không tồn tại", HttpStatus.NOT_FOUND),
    SETTLEMENT_NOT_FOUND("Đợt tất toán không tồn tại", HttpStatus.NOT_FOUND),
    SETTLEMENT_PERIOD_NOT_CLOSED("Chỉ tạo đợt tất toán cho kỳ doanh thu đã kết thúc", HttpStatus.BAD_REQUEST),
    SETTLEMENT_ALREADY_EXISTS("Đối tác đã có đợt tất toán cho kỳ doanh thu này", HttpStatus.CONFLICT),
    SETTLEMENT_ALREADY_APPROVED("Đợt tất toán đã được duyệt — không thể thao tác lại", HttpStatus.CONFLICT),
    SETTLEMENT_INVALID_STATUS("Trạng thái đợt tất toán không cho phép thao tác này", HttpStatus.CONFLICT),
    SETTLEMENT_NO_ELIGIBLE_REVENUE("Không có khoản doanh thu nào đủ điều kiện để tất toán", HttpStatus.BAD_REQUEST),
    SETTLEMENT_ELIGIBILITY_CHANGED("Điều kiện tất toán đã thay đổi — vui lòng cập nhật lại đợt tất toán", HttpStatus.CONFLICT),
    FINANCIAL_ADJUSTMENT_NOT_FOUND("Khoản điều chỉnh tài chính không tồn tại", HttpStatus.NOT_FOUND),
    WALLET_INSUFFICIENT_BALANCE("Số dư ví không đủ để thực hiện khoản khấu trừ", HttpStatus.CONFLICT),

    // ── Notification ──────────────────────────────────────────────────────────
    NOTIFICATION_NOT_FOUND("Thông báo không tồn tại", HttpStatus.NOT_FOUND);

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
