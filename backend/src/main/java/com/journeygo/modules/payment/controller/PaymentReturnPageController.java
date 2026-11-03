package com.journeygo.modules.payment.controller;

import com.journeygo.modules.payment.config.VnPayProperties;
import com.journeygo.modules.payment.service.PaymentService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.util.Map;

/**
 * Trang trả kết quả thanh toán cho TRÌNH DUYỆT (web + mobile).
 *
 * <p>── Vì sao cần controller này? ──
 * <ul>
 *   <li><b>Web:</b> VNPay redirect về {@code /payments/return} sau khi thanh toán.
 *       Trình duyệt cần một TRANG để hiển thị kết quả, không phải JSON thô.</li>
 *   <li><b>Mobile:</b> app mở trình duyệt NGOÀI để thanh toán. Khi xong, trình duyệt
 *       vẫn mở — app KHÔNG nhận được redirect. Nếu trang này tự chuyển hướng về
 *       scheme của app ({@code journeygo://payment/return?...}), hệ điều sẽ mở lại app
 *       ⇒ khách thấy màn kết quả ngay.</li>
 * </ul>
 *
 * <p>⇒ Đây là lớp bổ sung cho luồng polling sẵn có: dù app có mở lại được hay không,
 * app vẫn tự tra trạng thái qua {@code GET /payments/{id}} + QueryDR.
 *
 * <p>⚠️ Return URL KHÔNG phải nguồn xác minh đáng tin cậy — backend tự xác minh chữ ký
 * rồi QueryDR nếu chưa rõ kết quả (xem {@code PaymentService#processReturn}).
 */
@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payment Return Page (trình duyệt)",
        description = "Trang kết quả thanh toán cho trình duyệt + chuyển hướng về app mobile")
public class PaymentReturnPageController {

    /** Scheme của app mobile — dùng để mở lại app sau khi thanh toán. */
    private static final String APP_SCHEME_DEFAULT = "journeygo";

    /** Route trong app sau khi mở lại. */
    private static final String APP_ROUTE = "payment/return";

    private final PaymentService paymentService;
    private final VnPayProperties properties;

    @GetMapping(value = "/return-page", produces = MediaType.TEXT_HTML_VALUE)
    @Operation(summary = "Trang kết quả thanh toán (cho trình duyệt)",
            description = "Xác minh chữ ký, QueryDR nếu chưa rõ kết quả, rồi hiển thị trang "
                    + "kết quả. Nếu có `app_redirect=1`, trang sẽ chuyển hướng về app mobile.")
    public ResponseEntity<String> returnPage(
            @RequestParam Map<String, String> params,
            HttpServletRequest httpRequest) {
        String txnRef = params.get("vnp_TxnRef");
        String status = "UNKNOWN";
        String message = "Đang xác minh kết quả thanh toán…";
        String bookingCode = null;

        try {
            var result = paymentService.processReturn(params, null, resolveClientIp(httpRequest));
            status = result.status() != null ? result.status() : "UNKNOWN";
            message = result.message() != null ? result.message() : "";
            bookingCode = result.bookingCode();
        } catch (Exception e) {
            // Không được để lỗi làm trang trắng — vẫn hiển thị cho khách biết cần tra cứu.
            message = "Chưa xác minh được kết quả thanh toán. Vui lòng quay lại ứng dụng và kiểm tra lại.";
        }

        boolean success = "SUCCESS".equals(status);
        boolean wantAppRedirect = "1".equals(params.get("app_redirect"))
                || "true".equalsIgnoreCase(params.get("app_redirect"));

        String scheme = properties.getAppScheme() != null && !properties.getAppScheme().isBlank()
                ? properties.getAppScheme()
                : APP_SCHEME_DEFAULT;
        // Deep link chỉ mang `vnp_TxnRef` — app dùng mã này để tra cứu giao dịch.
        // KHÔNG truyền toàn bộ query string (chứa vnp_SecureHash) về app.
        StringBuilder appLink = new StringBuilder();
        appLink.append(scheme).append("://").append(APP_ROUTE);
        if (txnRef != null && !txnRef.isBlank()) {
            appLink.append("?vnp_TxnRef=").append(urlEncode(txnRef));
        }

        String html = buildHtml(status, message, bookingCode, appLink.toString(),
                wantAppRedirect, success);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType("text/html;charset=UTF-8"))
                .body(html);
    }

    private String buildRawQuery(Map<String, String> params) {
        StringBuilder sb = new StringBuilder();
        for (Map.Entry<String, String> e : params.entrySet()) {
            if (e.getValue() == null || e.getValue().isBlank()) continue;
            if (sb.length() > 0) sb.append('&');
            sb.append(urlEncode(e.getKey())).append('=').append(urlEncode(e.getValue()));
        }
        return sb.toString();
    }

    private static String urlEncode(String value) {
        return java.net.URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    /**
     * Trang kết quả thanh toán cho trình duyệt — tự chuyển hướng về app mobile.
     *
     * <p>── Vì sao cần JavaScript, không chỉ {@code <meta http-equiv="refresh">}? ──
     * <ul>
     *   <li>Chrome/Samsung Internet trên Android <b>chặn</b> chuyển hướng tự động tới
     *       custom scheme ({@code journeygo://}) nếu không có "user gesture" — đó là
     *       "intent redirect policy". {@code <meta refresh>} rơi vào nhóm bị chặn ⇒ trang
     *       đứng yên, khách phải tự bấm nút.</li>
     *   <li>{@code window.location.replace()} cũng bị coi là không có user gesture
     *       trong một số phiên bản ⇒ cần <b>click giả</b> (synthesized click) để mở app.</li>
     *   <li>{@code intent://} là cách chuẩn của Android để mở app: nếu app có cài đặt,
     *       hệ thống mở app; nếu không, mở Play Store. Safari iOS không hỗ trợ ⇒ fallback
     *       về {@code window.location} với scheme thuần.</li>
     * </ul>
     *
     * <p>⇒ Ta thử theo thứ tự: (1) click giả vào {@code <a href="journeygo://...">},
     * (2) {@code intent://} URL, (3) {@code window.location.replace()}. Luôn kèm nút bấm
     * tay để khách có lối thoát chắc chắn.
     */
    private String buildHtml(String status, String message, String bookingCode,
                             String appUrl, boolean autoRedirect, boolean success) {
        String title = success ? "Thanh toán thành công" : "Kết quả thanh toán";
        String icon = success ? "✅" : "ℹ️";
        String color = success ? "#0f9d58" : "#1a73e8";

        StringBuilder sb = new StringBuilder();
        sb.append("<!DOCTYPE html><html lang=\"vi\"><head><meta charset=\"utf-8\">")
                .append("<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">")
                .append("<title>").append(title).append("</title>");

        if (autoRedirect) {
            // Meta refresh là Dự phòng (fallback) cho trình duyệt cũ / iOS.
            sb.append("<meta http-equiv=\"refresh\" content=\"1;url=")
                    .append(escapeHtml(appUrl)).append("\">");
        }
        sb.append("<style>")
                .append("body{font-family:system-ui,-apple-system,'Segoe UI',sans-serif;margin:0;")
                .append("background:#f5f7fa;display:flex;align-items:center;justify-content:center;")
                .append("min-height:100vh;}")
                .append(".card{background:#fff;border-radius:16px;padding:32px 24px;max-width:420px;")
                .append("width:calc(100% - 32px);text-align:center;box-shadow:0 4px 24px rgba(0,0,0,.08);}")
                .append(".icon{font-size:48px;}")
                .append("h1{font-size:20px;margin:12px 0 8px;color:#1f2937;}")
                .append("p{font-size:14px;color:#6b7280;line-height:1.5;margin:0 0 8px;}")
                .append(".code{font-weight:700;color:#374151;}")
                .append(".btn{display:inline-block;margin-top:20px;padding:12px 22px;border-radius:12px;")
                .append("background:").append(color).append(";color:#fff;text-decoration:none;font-weight:700;}")
                .append("</style></head><body><div class=\"card\">")
                .append("<div class=\"icon\">").append(icon).append("</div>")
                .append("<h1>").append(title).append("</h1>")
                .append("<p>").append(escapeHtml(message)).append("</p>");

        if (bookingCode != null && !bookingCode.isBlank()) {
            sb.append("<p class=\"code\">Mã đơn: ").append(escapeHtml(bookingCode)).append("</p>");
        }

        sb.append("<p style=\"font-size:12px;color:#9ca3af;margin-top:14px;\">")
                .append("Mã trạng thái: ").append(escapeHtml(status)).append("</p>");

        if (autoRedirect) {
            sb.append("<a id=\"openApp\" class=\"btn\" href=\"").append(escapeHtml(appUrl)).append("\">")
                    .append("Mở ứng dụng JourneyGo</a>");
            sb.append("<p style=\"font-size:12px;color:#9ca3af;margin-top:12px;\">")
                    .append("Nếu ứng dụng không tự mở, vui lòng chạm vào nút phía trên.</p>");
            // Script tự chuyển hướng về app — đặt CUỐI body để chắc chắn DOM đã sẵn sàng.
            sb.append(buildAutoRedirectScript(appUrl));
        } else {
            sb.append("<a class=\"btn\" href=\"/bookings\">Xem đơn của tôi</a>");
        }

        sb.append("</div></body></html>");
        return sb.toString();
    }

    /**
     * Script tự mở app mobile từ trình duyệt.
     *
     * <p>Chiến lược (xem {@link #buildHtml} để giải thích từng bước):
     * <ol>
     *   <li><b>Click giả</b> vào thẻ {@code <a href="journeygo://...">} — đây là cách
     *       duy nhất Chrome Android chấp nhận để mở custom scheme.</li>
     *   <li><b>{@code intent://}</b> — chuẩn Android, mở app nếu đã cài, mở Play Store nếu chưa.</li>
     *   <li><b>{@code window.location.replace()}</b> — fallback cho iOS Safari.</li>
     * </ol>
     *
     * <p>Mỗi bước cách nhau {@code 800ms} để không "race" nhau. Nếu app mở được, trang
     * bị đóng nên các bước sau không chạy (hoặc chạy trong tab đã bị bỏ).
     */
    private String buildAutoRedirectScript(String appUrl) {
        String escaped = escapeJs(appUrl);
        // intent:// chỉ dùng được trên Android; Safari sẽ báo lỗi nên ta bọc trong try/catch.
        String intentUrl = "intent://payment/return?scheme=journeygo&"
                + "vnp_TxnRef=" + extractTxnRef(appUrl) + "#Intent;scheme=journeygo;package=com.journeygo.mobile;end";

        return "<script>(function(){"
                + "var appUrl='" + escaped + "';"
                + "var link=document.getElementById('openApp');"
                + "function click(){try{ if(link){ link.click(); }}catch(e){} }"
                // Bước 1: click giả (Chrome Android yêu cầu user gesture).
                + "setTimeout(click,300);"
                // Bước 2: intent:// (Android)
                + "setTimeout(function(){try{"
                + "  var u='" + escapeJs(intentUrl) + "';"
                + "  if(/Android/i.test(navigator.userAgent)){ window.location.href=u; }"
                + "}catch(e){}},1100);"
                // Bước 3: scheme thuần (iOS Safari / trình duyệt khác)
                + "setTimeout(function(){try{ window.location.replace(appUrl); }catch(e){}},1900);"
                + "})();</script>";
    }

    /** Trích {@code vnp_TxnRef} từ deep link để dựng {@code intent://} URL. */
    private String extractTxnRef(String appUrl) {
        int idx = appUrl.indexOf("vnp_TxnRef=");
        if (idx < 0) return "";
        String rest = appUrl.substring(idx + "vnp_TxnRef=".length());
        int end = rest.indexOf('&');
        return end >= 0 ? rest.substring(0, end) : rest;
    }

    /** Escape chuỗi để nhúng an toàn vào JavaScript (escape cả dấu nháy và backslash). */
    private static String escapeJs(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\")
                .replace("'", "\\'")
                .replace("\"", "\\\"")
                .replace("\r", "")
                .replace("\n", "\\n")
                .replace("<", "\\u003c")
                .replace(">", "\\u003e");
    }

    private static String escapeHtml(String value) {
        if (value == null) return "";
        return value.replace("&", "&amp;")
                .replace("<", "&lt;")
                .replace(">", "&gt;")
                .replace("\"", "&quot;")
                .replace("'", "&#39;");
    }

    /** Lấy IP thật của client (ưu tiên {@code X-Forwarded-For} do reverse proxy/tunnel set). */
    private String resolveClientIp(HttpServletRequest request) {
        if (request == null) return null;
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            return normalizeIp(forwarded.split(",")[0].trim());
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return normalizeIp(realIp.trim());
        }
        return normalizeIp(request.getRemoteAddr());
    }

    private static String normalizeIp(String ip) {
        if (ip == null || ip.isBlank()) return ip;
        String trimmed = ip.trim();
        if ("::1".equals(trimmed) || "0:0:0:0:0:0:0:1".equals(trimmed)) {
            return "127.0.0.1";
        }
        if (trimmed.startsWith("::ffff:")) {
            return trimmed.substring("::ffff:".length());
        }
        return trimmed;
    }
}
