package com.journeygo.modules.auth.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:journeygo.platform@gmail.com}")
    private String fromEmail;

    @Value("${app.mail.from-name:JourneyGo Platform}")
    private String fromName;

    /**
     * Gửi email HTML. Không ném lỗi — lỗi gửi mail chỉ được ghi log để không làm hỏng nghiệp vụ gọi nó.
     *
     * @return true nếu gửi thành công
     */
    public boolean sendHtml(String toEmail, String subject, String htmlContent) {
        if (toEmail == null || toEmail.isBlank()) {
            log.warn("Bỏ qua email '{}' vì không có địa chỉ người nhận", subject);
            return false;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name());
            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            mailSender.send(message);
            log.info("Đã gửi email '{}' đến {}", subject, toEmail);
            return true;
        } catch (Exception ex) {
            log.error("Không thể gửi email '{}' đến {}: {}", subject, toEmail, ex.getMessage());
            return false;
        }
    }

    public String getFromEmail() {
        return fromEmail;
    }

    public void sendPasswordResetOtp(String toEmail, String fullName, String otp, int expiryMinutes) {
        log.info("===> [OTP RESET PASSWORD] Đang gửi mã OTP đến email: {} | OTP: {} (Thời hạn: {} phút)",
                toEmail, otp, expiryMinutes);

        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name()
            );

            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject("Mã xác thực khôi phục mật khẩu - JourneyGo");

            String displayName = (fullName != null && !fullName.isBlank()) ? fullName : "Quý khách";

            String htmlContent = buildOtpEmailHtml(displayName, otp, expiryMinutes);
            helper.setText(htmlContent, true);

            mailSender.send(message);
            log.info("Gửi email chứa mã OTP khôi phục mật khẩu đến {} thành công", toEmail);

        } catch (Exception ex) {
            log.error("Không thể gửi email OTP đến {}: {}", toEmail, ex.getMessage(), ex);
            throw new AppException(ErrorCode.MAIL_SEND_FAILED, "Không thể gửi email OTP: " + ex.getMessage());
        }
    }

    private String buildOtpEmailHtml(String displayName, String otp, int expiryMinutes) {
        String template = """
                <!DOCTYPE html>
                <html lang="vi">
                <head>
                    <meta charset="UTF-8">
                    <style>
                        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; margin: 0; padding: 0; }
                        .container { max-width: 580px; margin: 30px auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.06); border: 1px solid #e2e8f0; }
                        .header { background: linear-gradient(135deg, #0d9488 0%, #0f766e 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
                        .header h1 { margin: 0; font-size: 24px; font-weight: 700; letter-spacing: 0.5px; }
                        .header p { margin: 8px 0 0; font-size: 14px; opacity: 0.9; }
                        .body { padding: 32px 28px; color: #334155; line-height: 1.6; }
                        .greeting { font-size: 16px; font-weight: 600; margin-bottom: 12px; }
                        .otp-box { margin: 28px 0; text-align: center; }
                        .otp-code { display: inline-block; font-size: 32px; font-weight: 800; letter-spacing: 8px; color: #0d9488; background-color: #f0fdfa; border: 2px dashed #0d9488; border-radius: 12px; padding: 14px 28px; }
                        .expiry { color: #e11d48; font-weight: 600; font-size: 13px; text-align: center; margin-top: 8px; }
                        .notice { font-size: 13px; color: #64748b; background-color: #f1f5f9; padding: 14px; border-radius: 8px; margin-top: 24px; }
                        .footer { background-color: #f8fafc; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8; border-top: 1px solid #e2e8f0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <div class="header">
                            <h1>JourneyGo</h1>
                            <p>Nền Tảng Trải Nghiệm & Du Lịch Di Sản</p>
                        </div>
                        <div class="body">
                            <div class="greeting">Xin chào {{displayName}},</div>
                            <p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản JourneyGo liên kết với email này.</p>
                            <p>Vui lòng sử dụng mã xác thực OTP bên dưới để hoàn tất việc đổi mật khẩu mới:</p>
                            <div class="otp-box">
                                <div class="otp-code">{{otp}}</div>
                                <div class="expiry">Mã OTP có hiệu lực trong {{expiryMinutes}} phút</div>
                            </div>
                            <div class="notice">
                                <strong>Lưu ý bảo mật:</strong> Không chia sẻ mã OTP này cho bất kỳ ai. Nếu bạn không thực hiện yêu cầu này, vui lòng bỏ qua email hoặc liên hệ với bộ phận hỗ trợ của chúng tôi ngay lập tức.
                            </div>
                        </div>
                        <div class="footer">
                            &copy; 2026 JourneyGo Platform. Mọi quyền được bảo lưu.
                        </div>
                    </div>
                </body>
                </html>
                """;

        return template
                .replace("{{displayName}}", displayName)
                .replace("{{otp}}", otp)
                .replace("{{expiryMinutes}}", String.valueOf(expiryMinutes));
    }
}
