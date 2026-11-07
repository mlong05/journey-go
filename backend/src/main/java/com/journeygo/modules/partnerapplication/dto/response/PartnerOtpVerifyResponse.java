package com.journeygo.modules.partnerapplication.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;

@Schema(description = "Kết quả xác minh OTP email khi đăng ký trở thành đối tác")
public record PartnerOtpVerifyResponse(
        @Schema(description = "Email đã xác minh") String email,
        @Schema(description = "Email đã có tài khoản trên hệ thống hay chưa") boolean accountExists,
        @Schema(description = "Thông báo hướng dẫn người dùng") String message,
        @Schema(description = "Token xác nhận email đã verify — bắt buộc kèm khi lưu nháp / gửi đơn")
        String verificationToken
) {
}
