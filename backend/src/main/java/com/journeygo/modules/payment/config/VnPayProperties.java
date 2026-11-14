package com.journeygo.modules.payment.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.time.Duration;

/**
 * Cấu hình tích hợp VNPay.
 *
 * <p>Toàn bộ thông tin nhạy cảm đọc từ biến môi trường — KHÔNG hardcode credentials.
 * Xem {@code .env.example} / {@code application.yml} cho danh sách biến.
 *
 * <p>Prefix là {@code app.vnpay} — khớp với vị trí cấu hình trong {@code application.yml}
 * (cùng nhóm với {@code app.finance}).
 */
@Component
@Getter
@Setter
@ConfigurationProperties(prefix = "app.vnpay")
public class VnPayProperties {

    /** Bật/tắt tích hợp VNPay. */
    private boolean enabled = false;

    /** Mã định danh kết nối (vnp_TmnCode). Sandbox: DEMOV210. */
    private String tmnCode = "";

    /** Chuỗi bí mật (vnp_HashSecret) dùng tạo/kiểm tra checksum. */
    private String hashSecret = "";

    /** Phiên bản API. VNPay khuyến cáo 2.1.0 với HMACSHA512. */
    private String version = "2.1.0";

    /** URL tạo trang thanh toán (redirect/QR). */
    private String paymentUrl = "https://sandbox.vnpayment.vn/paymentv2/vpcpay.html";

    /** URL merchant web API (QueryDR / Refund). */
    private String merchantApiUrl = "https://sandbox.vnpayment.vn/merchant_webapi/api/transaction";

    /**
     * URL lấy danh sách ngân hàng / phương thức thanh toán mà VNPay hỗ trợ.
     *
     * <p>API chính thức: {@code POST}, {@code Content-Type: application/x-www-form-urlencoded},
     * body {@code tmn_code=...}.
     */
    private String bankListUrl = "https://sandbox.vnpayment.vn/qrpayauth/api/merchant/get_bank_list";

    /** URL nhận IPN (webhook) — phải là HTTPS theo yêu cầu VNPay. */
    private String ipnUrl = "";

    /** URL nhận kết quả trả về (Return URL) sau khi khách thanh toán. */
    private String returnUrl = "";

    /**
     * Return URL riêng cho APP MOBILE — dạng CUSTOM SCHEME (deep link).
     *
     * <p>VD: {@code journeygo://payment/return}
     *
     * <p>── Vì sao dùng scheme thay vì URL https? ──
     * <ul>
     *   <li>VNPay Sandbox ĐÃ KIỂM CHỨNG: khi {@code vnp_ReturnUrl} là custom scheme,
     *       sau khi khách thanh toán (hoặc bấm "Hủy"), VNPay chuyển hướng TRÌNH DUYỆT
     *       thẳng về scheme đó, kèm <b>TOÀN BỘ tham số kết quả đã ký</b>
     *       ({@code vnp_ResponseCode}, {@code vnp_TransactionStatus},
     *       {@code vnp_TransactionNo}, {@code vnp_PayDate}, {@code vnp_SecureHash}…).</li>
     *   <li>Nhờ vậy app nhận được kết quả NGAY mà KHÔNG CẦN máy chủ trung gian
     *       (ngrok/tunnel) còn sống ⇒ hoạt động ổn định hơn nhiều so với mô hình
     *       "web trung gian → JS redirect → app".</li>
     * </ul>
     *
     * <p>App gửi kèm các tham số này lên backend để backend kiểm tra chữ ký
     * rồi áp dụng — xem {@code POST /payments/return-result}.
     *
     * <p>⚠️ Thanh toán CHỈ diễn ra trên ứng dụng MOBILE. Web không có màn checkout
     * nên KHÔNG cần Return URL riêng cho web.
     *
     * <p>Nếu để trống ⇒ dùng {@link #returnUrl} (https) + gắn {@code app_redirect=1}
     * ⇒ trang kết quả của backend tự chuyển hướng trình duyệt về app (cần tunnel).
     */
    private String appReturnUrl = "";

    /**
     * Bật tự chuyển hướng về app mobile sau khi thanh toán xong.
     *
     * <p>Return URL được gắn thêm {@code app_redirect=1} ⇒ trang
     * {@code /payments/return-page} sẽ chuyển hướng trình duyệt về scheme của app
     * ({@link #appScheme}) ⇒ app mở lại và hiện màn kết quả.
     *
     * <p>⚠️ Cờ này chỉ là MẶC ĐỊNH toàn cục. Mỗi giao dịch có thể bật/tắt riêng qua
     * tham số {@code appRedirect} của {@code POST /payments/bookings/{id}/init}
     * ⇒ WEB (không gửi cờ) và MOBILE (gửi cờ) dùng chung một cấu hình Return URL.
     */
    private boolean appRedirectEnabled = false;

    /** Scheme của app mobile (deep link) — ví dụ {@code journeygo}. */
    private String appScheme = "journeygo";

    /** Địa chỉ IP server gửi lên VNPay (vnp_IpAddr). */
    private String ipAddr = "127.0.0.1";

    /** Múi giờ dùng cho các trường ngày giờ của VNPay (yyyyMMddHHmmss). */
    private String timezone = "Asia/Ho_Chi_Minh";

    /** Số phút cho phép thanh toán — phải khớp với thời hạn Booking. */
    private int expiryMinutes = 10;

    /** Timeout gọi merchant API (ms). */
    private int apiTimeoutMs = 15000;

    /** Bật kiểm tra chữ ký IPN/Return. KHÔNG được tắt trong production. */
    private boolean verifySignature = true;

    /** Ngôn ngữ mặc định. */
    private String locale = "vn";

    /** Loại giao dịch VNPay (vnp_OrderType). */
    private String orderType = "other";

    /** Cổng thanh toán cố định (để trống = khách tự chọn trên trang VNPay). */
    private String bankCode = "";

    // ── Mapping bank_type của API get_bank_list ──────────────────────────────
    // Tài liệu chính thức "Danh sách ứng dụng, ngân hàng liên kết" chia thành 4 mục
    // (VNPAY-QR, deep-link, ATM nội địa, thẻ quốc tế) nhưng KHÔNG nêu rõ mã số
    // tương ứng của `bank_type` trong response. Các giá trị dưới đây là giá trị mặc định
    // và CÓ THỂ cấu hình lại qua biến môi trường nếu VNPay Sandbox trả về khác.

    /** Mã bank_type cho nhóm "Ứng dụng Ngân hàng & Ví điện tử" (VNPAY-QR). */
    private Integer qrBankType = 1;

    /** Mã bank_type cho nhóm "Thẻ ATM / Tài khoản ngân hàng nội địa". */
    private Integer domesticCardBankType = 2;

    /** Mã bank_type cho nhóm "Thẻ thanh toán quốc tế". */
    private Integer internationalCardBankType = 3;

    /** Thời gian chờ tối đa cho một thao tác HTTP. */
    public Duration apiTimeout() {
        return Duration.ofMillis(apiTimeoutMs);
    }

    /** Kiểm tra cấu hình tối thiểu để gọi được VNPay. */
    public boolean isConfigured() {
        return enabled
                && tmnCode != null && !tmnCode.isBlank()
                && hashSecret != null && !hashSecret.isBlank();
    }

    /** Số tiền VND → số nguyên gửi lên VNPay (nhân 100). */
    public static long toVnPayAmount(BigDecimal amount) {
        return amount == null ? 0L : amount.multiply(BigDecimal.valueOf(100)).longValueExact();
    }
}
