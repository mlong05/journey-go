package com.journeygo.modules.partnerapplication.service;

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

/**
 * Gửi email cho luồng "Đăng ký đối tác".
 *
 * <p>Tách riêng khỏi {@code auth.EmailService} vì nội dung email thuộc nghiệp vụ đối tác
 * (OTP xác minh email, thông báo duyệt, thông báo từ chối) — không liên quan đăng nhập.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PartnerApplicationEmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:journeygo.platform@gmail.com}")
    private String fromEmail;

    @Value("${app.mail.from-name:JourneyGo Platform}")
    private String fromName;

    /** Link để đối tác đăng nhập sau khi được duyệt. */
    @Value("${app.partner.web-login-url:http://localhost:3000/login}")
    private String webLoginUrl;

    /**
     * Mật khẩu SMTP. Rỗng ⇒ chưa cấu hình mail ⇒ không gửi được email.
     */
    @Value("${spring.mail.password:}")
    private String mailPasswordConfigured;

    /** Link thiết lập mật khẩu (activation token) gửi kèm email duyệt. */
    @Value("${app.partner.activation-url:http://localhost:3000/activate}")
    private String activationUrl;

    // ── 1. OTP xác minh email ───────────────────────────────────────────────────

    public void sendPartnerOtp(String toEmail, String otp, int expiryMinutes) {
        log.info("===> [OTP ĐĂNG KÝ ĐỐI TÁC] Gửi OTP tới {} | OTP: {} (hạn {} phút)", toEmail, otp, expiryMinutes);

        String html = """
                <!DOCTYPE html>
                <html lang="vi">
                <head><meta charset="UTF-8"></head>
                <body style="font-family:'Segoe UI',Tahoma,sans-serif;background:#f8fafc;margin:0;padding:24px;">
                  <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
                    <div style="background:linear-gradient(135deg,#0d9488,#0f766e);padding:32px 24px;text-align:center;color:#fff;">
                      <h1 style="margin:0;font-size:22px;">Trở thành đối tác của JourneyGo</h1>
                      <p style="margin:8px 0 0;font-size:14px;opacity:.9;">Xác minh email để tiếp tục đăng ký</p>
                    </div>
                    <div style="padding:32px 28px;color:#334155;line-height:1.6;">
                      <p>Xin chào,</p>
                      <p>Mã xác thực của bạn để đăng ký trở thành đối tác là:</p>
                      <div style="margin:24px 0;text-align:center;">
                        <span style="display:inline-block;font-size:32px;font-weight:800;letter-spacing:8px;color:#0d9488;background:#f0fdfa;border:2px dashed #0d9488;border-radius:12px;padding:14px 28px;">{{otp}}</span>
                      </div>
                      <p style="color:#e11d48;font-weight:600;font-size:13px;text-align:center;margin-top:8px;">Mã có hiệu lực trong {{expiryMinutes}} phút</p>
                      <div style="font-size:13px;color:#64748b;background:#f1f5f9;padding:14px;border-radius:8px;margin-top:24px;">
                        <strong>Lưu ý:</strong> Mã mới được gửi sẽ làm mã cũ mất hiệu lực. Không chia sẻ mã này cho bất kỳ ai.
                      </div>
                    </div>
                    <div style="background:#f8fafc;padding:20px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;">
                      &copy; 2026 JourneyGo Platform. Mọi quyền được bảo lưu.
                    </div>
                  </div>
                </body>
                </html>
                """;

        send(toEmail, "Mã xác thực đăng ký đối tác - JourneyGo",
                html.replace("{{otp}}", otp).replace("{{expiryMinutes}}", String.valueOf(expiryMinutes)));
    }

    // ── 2. Email thông báo được duyệt ───────────────────────────────────────────

    /**
     * Email duyệt hồ sơ: thông báo hồ sơ được duyệt, kèm link thiết lập mật khẩu
     * (activation token) và link truy cập web để đăng nhập.
     */
    public void sendApprovalEmail(String toEmail, String representativeName, String businessName,
                                  String activationLink, String loginLink) {
        String displayName = (representativeName != null && !representativeName.isBlank())
                ? representativeName : "Quý khách";

        String html = """
                <!DOCTYPE html>
                <html lang="vi">
                <head><meta charset="UTF-8"></head>
                <body style="font-family:'Segoe UI',Tahoma,sans-serif;background:#f8fafc;margin:0;padding:24px;">
                  <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
                    <div style="background:linear-gradient(135deg,#059669,#047857);padding:32px 24px;text-align:center;color:#fff;">
                      <h1 style="margin:0;font-size:22px;">Hồ sơ đã được phê duyệt</h1>
                      <p style="margin:8px 0 0;font-size:14px;opacity:.9;">Chào mừng bạn đến với JourneyGo</p>
                    </div>
                    <div style="padding:32px 28px;color:#334155;line-height:1.6;">
                      <p>Xin chào <strong>{{name}}</strong>,</p>
                      <p>Chúng tôi vui thông báo hồ sơ đăng ký trở thành đối tác của <strong>{{business}}</strong> đã được phê duyệt.</p>
                      <p>Tài khoản đối tác đã được cấp với quyền: <strong>Đăng ký và quản lý tour, điểm đến, trải nghiệm, nhiệm vụ và nội dung văn hóa</strong>, đồng thời hưởng doanh thu qua ví nội bộ.</p>
                      <div style="margin:24px 0;text-align:center;">
                        <a href="{{activationLink}}" style="display:inline-block;background:#047857;color:#fff;text-decoration:none;font-weight:700;padding:14px 28px;border-radius:999px;">Thiết lập mật khẩu</a>
                      </div>
                      <p style="text-align:center;font-size:13px;color:#64748b;">
                        Hoặc truy cập trực tiếp: <a href="{{loginLink}}" style="color:#0d9488;">{{loginLink}}</a>
                      </p>
                      <div style="font-size:13px;color:#64748b;background:#f1f5f9;padding:14px;border-radius:8px;margin-top:24px;">
                        <strong>Lưu ý:</strong> Vui lòng thiết lập mật khẩu ngay để bắt đầu đăng ký nội dung.
                      </div>
                    </div>
                    <div style="background:#f8fafc;padding:20px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;">
                      &copy; 2026 JourneyGo Platform. Mọi quyền được bảo lưu.
                    </div>
                  </div>
                </body>
                </html>
                """;

        send(toEmail, "Thông báo phê duyệt đơn đăng ký đối tác JourneyGo",
                html.replace("{{name}}", displayName)
                        .replace("{{business}}", (businessName != null ? businessName : "doanh nghiệp"))
                        .replace("{{activationLink}}", activationLink)
                        .replace("{{loginLink}}", loginLink));
    }

    // ── 3. Email thông báo từ chối ──────────────────────────────────────────────

    public void sendRejectionEmail(String toEmail, String representativeName, String businessName,
                                   String reason, String supportContact) {
        String displayName = (representativeName != null && !representativeName.isBlank())
                ? representativeName : "Quý khách";

        String html = """
                <!DOCTYPE html>
                <html lang="vi">
                <head><meta charset="UTF-8"></head>
                <body style="font-family:'Segoe UI',Tahoma,sans-serif;background:#f8fafc;margin:0;padding:24px;">
                  <div style="max-width:580px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
                    <div style="background:linear-gradient(135deg,#e11d48,#be123c);padding:32px 24px;text-align:center;color:#fff;">
                      <h1 style="margin:0;font-size:22px;">Hồ sơ chưa được phê duyệt</h1>
                      <p style="margin:8px 0 0;font-size:14px;opacity:.9;">Thông báo từ chối đơn đăng ký đối tác</p>
                    </div>
                    <div style="padding:32px 28px;color:#334155;line-height:1.6;">
                      <p>Xin chào <strong>{{name}}</strong>,</p>
                      <p>Chúng tôi rất tiếc thông báo hồ sơ đăng ký trở thành đối tác của <strong>{{business}}</strong> chưa được phê duyệt.</p>
                      <div style="margin:20px 0;padding:16px;background:#fff1f2;border-left:4px solid #e11d48;border-radius:8px;">
                        <strong style="color:#be123c;">Lý do từ chối do quản trị viên cung cấp:</strong>
                        <p style="margin:8px 0 0;white-space:pre-line;">{{reason}}</p>
                      </div>
                      <p>Bạn hoàn toàn có thể chỉnh sửa hồ sơ và gửi lại. Nếu cần hỗ trợ, vui lòng liên hệ: <strong>{{support}}</strong></p>
                    </div>
                    <div style="background:#f8fafc;padding:20px;text-align:center;font-size:12px;color:#94a3b8;border-top:1px solid #e2e8f0;">
                      &copy; 2026 JourneyGo Platform. Mọi quyền được bảo lưu.
                    </div>
                  </div>
                </body>
                </html>
                """;

        send(toEmail, "Thông báo từ chối đơn đăng ký đối tác JourneyGo",
                html.replace("{{name}}", displayName)
                        .replace("{{business}}", (businessName != null ? businessName : "doanh nghiệp"))
                        .replace("{{reason}}", (reason != null ? reason : "Không nêu rõ"))
                        .replace("{{support}}", (supportContact != null ? supportContact : "support@journeygo.com")));
    }

    /**
     * SMTP có được cấu hình đầy đủ hay không.
     *
     * <p>Trong môi trường dev chưa có {@code SPRING_MAIL_PASSWORD} thì việc gửi mail luôn
     * thất bại ({@code 535 Authentication failed}). Khi đó luồng đăng ký vẫn cần chạy được
     * để test ⇒ OTP được ghi log ra console thay vì gửi qua mail.
     */
    public boolean isMailConfigured() {
        return mailPasswordConfigured != null && !mailPasswordConfigured.isBlank();
    }

    // ── Gửi mail ────────────────────────────────────────────────────────────────

    private void send(String toEmail, String subject, String html) {
        if (!isMailConfigured()) {
            // Dev mode: chưa cấu hình SMTP ⇒ không gửi được, nhưng KHÔNG được làm hỏng cả luồng
            // nghiệp vụ (OTP vẫn được lưu và kiểm thử được). Nội dung đã được log sẵn ở từng hàm.
            log.warn("[Email] Bỏ qua gửi '{}' tới {} — chưa cấu hình SPRING_MAIL_PASSWORD", subject, toEmail);
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    message,
                    MimeMessageHelper.MULTIPART_MODE_MIXED_RELATED,
                    StandardCharsets.UTF_8.name()
            );

            helper.setFrom(fromEmail, fromName);
            helper.setTo(toEmail);
            helper.setSubject(subject);
            helper.setText(html, true);

            mailSender.send(message);
            log.info("[Email] Đã gửi '{}' tới {}", subject, toEmail);
        } catch (Exception ex) {
            log.error("Không thể gửi email '{}' tới {}: {}", subject, toEmail, ex.getMessage(), ex);
            throw new AppException(ErrorCode.MAIL_SEND_FAILED, "Không thể gửi email: " + ex.getMessage());
        }
    }

    public String getWebLoginUrl() {
        return webLoginUrl;
    }

    public String getActivationUrl() {
        return activationUrl;
    }
}
