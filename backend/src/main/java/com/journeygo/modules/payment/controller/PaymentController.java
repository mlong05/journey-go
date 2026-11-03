package com.journeygo.modules.payment.controller;

import com.journeygo.common.dto.ApiResponse;
import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.common.security.AuthorizationGuard;
import com.journeygo.modules.payment.dto.response.PaymentInitResponse;
import com.journeygo.modules.payment.dto.response.PaymentMethodResponse;
import com.journeygo.modules.payment.dto.response.PaymentResponse;
import com.journeygo.modules.payment.dto.response.PaymentSummaryResponse;
import com.journeygo.modules.payment.dto.response.PaymentVerificationResponse;
import com.journeygo.modules.payment.entity.enums.PaymentOutcome;
import com.journeygo.modules.payment.entity.enums.PaymentStatus;
import com.journeygo.modules.payment.service.PaymentMethodService;
import com.journeygo.modules.payment.service.PaymentService;
import com.journeygo.security.UserPrincipal;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import lombok.RequiredArgsConstructor;
import org.springdoc.core.annotations.ParameterObject;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/payments")
@RequiredArgsConstructor
@Tag(name = "Payment (Thanh toán VNPay)",
        description = "Khởi tạo thanh toán, IPN/Return URL, QueryDR, retry và xử lý thanh toán trùng/muộn")
public class PaymentController {

    private final PaymentService paymentService;
    private final PaymentMethodService paymentMethodService;

    // ── Khởi tạo & retry ──────────────────────────────────────────────────────

    @PostMapping("/bookings/{bookingId}/init")
    @PreAuthorize("hasAnyRole('TOURIST', 'USER', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Khởi tạo thanh toán (hoặc thử lại)",
            description = "Trả về URL/QR thanh toán VNPay. Mỗi lần thử tạo một mã giao dịch riêng. "
                    + "Nếu lần thử trước chưa rõ kết quả, hệ thống tự QueryDR trước; "
                    + "chỉ khi xác minh rõ ràng thất bại mới cho tạo lần thử mới. "
                    + "Không gia hạn thời hạn thanh toán 10 phút của Booking. "
                    + "Tham số bankCode cho phép chỉ định trước phương thức thanh toán "
                    + "(VNPAYQR / VNBANK / VISA hoặc mã ngân hàng cụ thể); "
                    + "bỏ trống thì khách tự chọn trên trang VNPay.")
    public ResponseEntity<ApiResponse<PaymentInitResponse>> initiate(
            @PathVariable Long bookingId,
            @RequestParam(required = false) String bankCode,
            @RequestParam(required = false, defaultValue = "false") boolean appRedirect,
            HttpServletRequest httpRequest,
            @AuthenticationPrincipal UserPrincipal principal) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.success("Khởi tạo thanh toán thành công",
                        paymentService.initiatePayment(bookingId, principal.getId(),
                                resolveClientIp(httpRequest), bankCode, appRedirect)));
    }

    // ── Phương thức thanh toán ────────────────────────────────────────────────

    @GetMapping("/methods")
    @PreAuthorize("hasAnyRole('TOURIST', 'USER', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Danh sách phương thức thanh toán khách hàng có thể chọn",
            description = "Trả về 3 nhóm phương thức VNPay hiển thị trên trang thanh toán: "
                    + "Ứng dụng Ngân hàng & Ví điện tử (VNPAYQR), Thẻ nội địa & tài khoản ngân hàng (VNBANK), "
                    + "Thẻ thanh toán quốc tế (VISA) — kèm danh sách ngân hàng cụ thể lấy từ API "
                    + "chính thức get_bank_list của VNPay.")
    public ResponseEntity<ApiResponse<PaymentMethodResponse>> getPaymentMethods() {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách phương thức thanh toán thành công",
                paymentMethodService.getPaymentMethods()));
    }

    // ── VNPay callbacks ───────────────────────────────────────────────────────

    /**
     * IPN URL — VNPay gọi server-to-server.
     *
     * <p>Phải là PUBLIC endpoint (không yêu cầu JWT) và phải trả về đúng format VNPay yêu cầu.
     * Đăng ký URL này trong trang quản trị VNPay Sandbox.
     *
     * <p><b>Phương thức:</b> tài liệu chính thức của VNPay 2.1.0 ghi
     * {@code "Cài đặt Code IPN URL — Phương thức: GET"}, và dạng URL VNPay gọi về là
     * {@code https://{domain}/IPN?vnp_Amount=...&vnp_ResponseCode=00&...} (query string).
     * Tuy nhiên một số phiên bản sandbox dùng {@code POST} với body form-encoded.
     * Endpoint này nhận <b>CẢ HAI</b> để tương thích với mọi biến thể.
     *
     * <p><b>Phản hồi:</b> theo tài liệu, merchant trả {@code RspCode} + {@code Message}.
     * {@code 00} = đã cập nhật, {@code 02} = đã cập nhật trước đó, {@code 01}/{@code 04}/
     * {@code 97}/{@code 99} = lỗi → VNPay retry. Trả HTTP 200 cho mọi trường hợp đã xử lý
     * được, vì HTTP error cũng bị tính là timeout và gây retry không cần thiết.
     */
    @RequestMapping(value = "/ipn", method = {RequestMethod.GET, RequestMethod.POST})
    @Operation(summary = "IPN — thông báo kết quả thanh toán từ VNPay (webhook)",
            description = "Endpoint public, server-to-server. Nhận cả GET và POST. "
                    + "Xác minh chữ ký HMACSHA512 trước khi xử lý. "
                    + "Trả về {\"RspCode\":\"00\",\"Message\":\"...\"} khi đã cập nhật thành công.")
    public ResponseEntity<Map<String, Object>> ipn(@RequestParam Map<String, String> params) {
        Map<String, Object> result = paymentService.processIpn(params);
        // Luôn trả HTTP 200: VNPay đọc trạng thái qua RspCode, không qua HTTP status.
        // Trả 4xx/5xx khiến VNPay coi như lỗi mạng và retry liên tục.
        return ResponseEntity.ok(result);
    }

    /**
     * Return URL — VNPay redirect người dùng về sau khi thanh toán.
     *
     * <p>Không phải nguồn xác minh đáng tin cậy — nếu chưa rõ kết quả, hệ thống tự QueryDR.
     */
    @GetMapping("/return")
    @Operation(summary = "Return URL — kết quả thanh toán sau khi khách thanh toán",
            description = "Xác minh chữ ký, sau đó QueryDR nếu chưa rõ kết quả. "
                    + "Trả về trạng thái cuối cùng để frontend hiển thị.")
    public ResponseEntity<ApiResponse<PaymentVerificationResponse>> returnUrl(
            @RequestParam Map<String, String> params,
            HttpServletRequest httpRequest,
            @AuthenticationPrincipal UserPrincipal principal) {
        Long touristId = principal != null ? principal.getId() : null;
        return ResponseEntity.ok(ApiResponse.success("Xử lý kết quả thanh toán",
                paymentService.processReturn(params, touristId, resolveClientIp(httpRequest))));
    }

    // ── Query / tra cứu ───────────────────────────────────────────────────────

    /**
     * Nhận kết quả thanh toán do APP MOBILE gửi lên.
     *
     * <p>── Vì sao cần endpoint này? ──
     * <p>Khi {@code vnp_ReturnUrl} là CUSTOM SCHEME ({@code journeygo://payment/return}),
     * VNPay chuyển hướng trình duyệt thẳng về app, mang theo TOÀN BỘ tham số kết quả
     * ĐÃ KÝ của VNPay ({@code vnp_ResponseCode}, {@code vnp_TransactionStatus},
     * {@code vnp_TransactionNo}, {@code vnp_PayDate}, {@code vnp_SecureHash}…).
     *
     * <p>App gửi lại các tham số đó qua endpoint này ⇒ backend kiểm tra chữ ký
     * HMACSHA512 rồi áp dụng kết quả ⇒ khách thấy "thanh toán thành công" NGAY,
     * <b>không cần máy chủ trung gian (ngrok/tunnel) còn sống</b>, và không phụ thuộc
     * lệnh {@code querydr} (lệnh này đang trả {@code 99} trên VNPay Sandbox).
     *
     * <p>Endpoint này là <b>public</b> (không cần JWT) vì deep link có thể mở app khi
     * người dùng chưa đăng nhập — nhưng mọi tham số đều phải có chữ ký hợp lệ nên
     * không thể giả mạo kết quả thanh toán.
     *
     * <p>Trả về cùng cấu trúc với {@code /payments/return}.
     */
    @PostMapping(value = "/return-result", consumes = MediaType.APPLICATION_FORM_URLENCODED_VALUE)
    @Operation(summary = "Nhận kết quả thanh toán từ app mobile (deep link)",
            description = "App gửi lại các tham số VNPay đã ký (vnp_*) nhận được qua deep link. "
                    + "Backend kiểm tra chữ ký HMACSHA512 rồi áp dụng kết quả vào Payment + Booking.")
    public ResponseEntity<ApiResponse<PaymentVerificationResponse>> returnResultFromApp(
            @RequestParam Map<String, String> params,
            HttpServletRequest httpRequest) {
        return ResponseEntity.ok(ApiResponse.success("Xử lý kết quả thanh toán",
                paymentService.processReturn(params, null, resolveClientIp(httpRequest))));
    }

    @GetMapping("/{paymentId}")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Chi tiết giao dịch thanh toán")
    public ResponseEntity<ApiResponse<PaymentResponse>> getById(
            @PathVariable Long paymentId,
            @AuthenticationPrincipal UserPrincipal principal) {
        boolean isAdmin = AuthorizationGuard.isAdmin();
        return ResponseEntity.ok(ApiResponse.success("Lấy thông tin giao dịch thành công",
                paymentService.getById(paymentId, principal.getId(), isAdmin)));
    }

    @GetMapping("/my")
    @PreAuthorize("hasAnyRole('TOURIST', 'USER', 'ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Lịch sử thanh toán của tôi")
    public ResponseEntity<ApiResponse<PageResponse<PaymentResponse>>> getMyPayments(
            @AuthenticationPrincipal UserPrincipal principal,
            @ParameterObject @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử thanh toán thành công",
                paymentService.getMyPayments(principal.getId(), pageable)));
    }

    @GetMapping("/bookings/{bookingId}")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Các lần thử thanh toán của một booking")
    public ResponseEntity<ApiResponse<PageResponse<PaymentResponse>>> getByBooking(
            @PathVariable Long bookingId,
            @AuthenticationPrincipal UserPrincipal principal,
            @ParameterObject @PageableDefault(page = 0, size = 10, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        boolean isAdmin = AuthorizationGuard.isAdmin();
        return ResponseEntity.ok(ApiResponse.success("Lấy lịch sử thanh toán của booking thành công",
                paymentService.getByBooking(bookingId, principal.getId(), isAdmin, pageable)));
    }

    @PostMapping("/{paymentId}/query")
    @PreAuthorize("hasAnyRole('ADMIN', 'TOURIST', 'USER')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Truy vấn kết quả giao dịch trực tiếp với VNPay (QueryDR)",
            description = "Dùng khi kết quả chưa rõ: timeout, callback đến muộn, hoặc cần đối soát. "
                    + "Không tự kết luận thất bại khi không xác minh được kết quả.")
    public ResponseEntity<ApiResponse<Map<String, Object>>> query(
            @PathVariable Long paymentId,
            HttpServletRequest httpRequest,
            @AuthenticationPrincipal UserPrincipal principal) {
        PaymentOutcome outcome = paymentService.queryAndResolve(paymentId, resolveClientIp(httpRequest));
        Map<String, Object> data = new HashMap<>();
        data.put("outcome", outcome.name());
        data.put("message", switch (outcome) {
            case SUCCESS -> "Giao dịch đã được xác minh thành công";
            case FAILED -> "Giao dịch đã được xác minh thất bại";
            case CANCELLED -> "Khách hàng đã hủy giao dịch";
            case DUPLICATE -> "Giao dịch trùng — đã được xử lý trước đó";
            case UNKNOWN -> "Chưa xác minh được kết quả — vẫn đang chờ";
        });
        return ResponseEntity.ok(ApiResponse.success("Truy vấn kết quả giao dịch", data));
    }

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Danh sách toàn bộ giao dịch (ADMIN)",
            description = "Hỗ trợ tìm kiếm theo mã giao dịch / mã đơn / mã giao dịch VNPay. "
                    + "Tìm kiếm chạy trên TOÀN HỆ THỐNG (không giới hạn trong 1 trang) nên mã "
                    + "giao dịch nằm ở trang khác vẫn tìm thấy được.")
    public ResponseEntity<ApiResponse<PageResponse<PaymentResponse>>> getAll(
            @RequestParam(required = false) PaymentStatus status,
            @RequestParam(required = false) String search,
            @ParameterObject @PageableDefault(page = 0, size = 20, sort = "createdAt", direction = Sort.Direction.DESC) Pageable pageable) {
        return ResponseEntity.ok(ApiResponse.success("Lấy danh sách giao dịch thành công",
                paymentService.getAll(status, search, pageable)));
    }

    @GetMapping("/summary")
    @PreAuthorize("hasRole('ADMIN')")
    @SecurityRequirement(name = "Bearer Authentication")
    @Operation(summary = "Tổng hợp giao dịch thanh toán toàn hệ thống (ADMIN)",
            description = "Trả về tổng tiền các tour đã thanh toán thành công, số giao dịch theo nhóm trạng thái. "
                    + "Số liệu độc lập với phân trang — dùng cho các ô chỉ số tổng quan.")
    public ResponseEntity<ApiResponse<PaymentSummaryResponse>> getSummary() {
        return ResponseEntity.ok(ApiResponse.success("Lấy tổng hợp giao dịch thành công",
                paymentService.getSummary()));
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Lấy IP thật của client (ưu tiên {@code X-Forwarded-For} do reverse proxy/tunnel set).
     *
     * <p>Chuẩn hoá IPv6 loopback ({@code ::1}) về {@code 127.0.0.1} — VNPay yêu cầu
     * {@code vnp_IpAddr} là địa chỉ IPv4, gửi IPv6 sẽ bị từ chối.
     */
    private String resolveClientIp(HttpServletRequest request) {
        if (request == null) {
            return null;
        }
        String forwarded = request.getHeader("X-Forwarded-For");
        if (forwarded != null && !forwarded.isBlank()) {
            // X-Forwarded-For: client, proxy1, proxy2 → lấy phần đầu
            return normalizeIp(forwarded.split(",")[0].trim());
        }
        String realIp = request.getHeader("X-Real-IP");
        if (realIp != null && !realIp.isBlank()) {
            return normalizeIp(realIp.trim());
        }
        return normalizeIp(request.getRemoteAddr());
    }

    /**
     * Chuẩn hoá địa chỉ IP: {@code ::1} / {@code 0:0:0:0:0:0:0:1} → {@code 127.0.0.1}.
     *
     * <p>VNPay chỉ chấp nhận IPv4 cho {@code vnp_IpAddr}; IPv6 loopback sẽ gây lỗi
     * "Invalid IpAddr" khi khởi tạo giao dịch.
     */
    private static String normalizeIp(String ip) {
        if (ip == null || ip.isBlank()) {
            return ip;
        }
        String trimmed = ip.trim();
        if ("::1".equals(trimmed) || "0:0:0:0:0:0:0:1".equals(trimmed)) {
            return "127.0.0.1";
        }
        // IPv4-mapped IPv6 dạng ::ffff:127.0.0.1 → 127.0.0.1
        if (trimmed.startsWith("::ffff:")) {
            return trimmed.substring("::ffff:".length());
        }
        return trimmed;
    }
}
