package com.journeygo.modules.payment.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.booking.repository.BookingRepository;
import com.journeygo.modules.booking.service.BookingService;
import com.journeygo.modules.booking.dto.response.BookingResponse;
import com.journeygo.modules.finance.config.FinanceProperties;
import com.journeygo.modules.notification.entity.enums.NotificationType;
import com.journeygo.modules.notification.service.NotificationPublisher;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.providerrevenue.service.ProviderRevenueService;
import com.journeygo.modules.payment.config.VnPayProperties;
import com.journeygo.modules.payment.dto.response.PaymentDetailResponse;
import com.journeygo.modules.payment.dto.response.PaymentInitResponse;
import com.journeygo.modules.payment.dto.response.PaymentResponse;
import com.journeygo.modules.payment.dto.response.PaymentSummaryResponse;
import com.journeygo.modules.payment.dto.response.PaymentVerificationResponse;
import com.journeygo.modules.payment.entity.Payment;
import com.journeygo.modules.payment.entity.enums.PaymentOutcome;
import com.journeygo.modules.payment.entity.enums.PaymentStatus;
import com.journeygo.modules.payment.repository.PaymentRepository;
import com.journeygo.modules.refund.dto.response.RefundResponse;
import com.journeygo.modules.refund.repository.RefundRequestRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Payment — luồng thanh toán qua VNPay.
 *
 * <p>Các quy tắc được cài đặt (theo tài liệu "Booking - Payment - Refund - Wallet &amp; Settlement"):
 * <ul>
 *   <li><b>UC-01 Timeout</b> — Booking có hạn thanh toán 10 phút; hết hạn thì EXPIRED và giải phóng
 *       slot; KHÔNG cho tạo Payment attempt mới cho Booking đã hết hạn.</li>
 *   <li><b>UC-03 Retry</b> — cho phép thử lại trên Booking cũ khi vẫn PENDING_PAYMENT và chưa hết hạn;
 *       mỗi lần thử có mã giao dịch riêng; KHÔNG gia hạn thời hạn 10 phút;
 *       nếu lần trước timeout / chưa rõ kết quả thì PHẢI truy vấn VNPay (QueryDR) trước.</li>
 *   <li><b>UC-04 Duplicate</b> — callback trùng được nhận diện qua {@code txnRef} + trạng thái;
 *       hai giao dịch thực sự cùng thành công thì chỉ một giao dịch xác nhận Booking,
 *       giao dịch còn lại được đánh dấu "khoản tiền dư" để chuyển sang quy trình hoàn tiền.</li>
 *   <li><b>UC-05 Late payment</b> — thanh toán đúng hạn nhưng callback đến muộn vẫn được xác nhận
 *       (dựa trên {@code vnp_PayDate}); thanh toán thực sự quá hạn thì KHÔNG tự xác nhận Booking
 *       mà chuyển sang trạng thái chờ xử lý / hoàn tiền.</li>
 * </ul>
 *
 * <p>Nguyên tắc bất di bất dịch: KHÔNG đánh dấu thanh toán thành công chỉ vì frontend báo thành công —
 * mọi kết luận đều dựa trên IPN có chữ ký hợp lệ hoặc QueryDR từ VNPay.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PaymentService {

    /** Hằng số trạng thái giao dịch của VNPay (vnp_TransactionStatus). */
    public static final String VNPAY_STATUS_SUCCESS = "00";
    public static final String VNPAY_STATUS_PENDING = "01";
    public static final String VNPAY_STATUS_FAILED = "02";
    public static final String VNPAY_STATUS_REVERSED = "04";
    public static final String VNPAY_STATUS_PROCESSING = "05";
    public static final String VNPAY_STATUS_SENT_TO_BANK = "06";
    public static final String VNPAY_STATUS_SUSPECTED_FRAUD = "07";
    public static final String VNPAY_STATUS_REFUND_REJECTED = "09";

    /** Hằng số mã phản hồi của VNPay (vnp_ResponseCode). */
    public static final String VNPAY_RESPONSE_SUCCESS = "00";

    /**
     * Mã phản hồi khi khách hủy giao dịch trên trang VNPay (đã kiểm chứng).
     *
     * <p>Đi kèm {@code vnp_TransactionStatus=02} (Failed).
     */
    public static final String VNPAY_RESPONSE_CANCELLED = "24";

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final PaymentRepository paymentRepository;
    private final RefundRequestRepository refundRepository;
    private final BookingRepository bookingRepository;
    private final BookingService bookingService;
    private final NotificationPublisher notifications;
    private final VnPayClient vnPayClient;
    private final VnPayProperties vnPayProperties;
    private final ProviderRevenueService providerRevenueService;
    private final PaymentMethodService paymentMethodService;
    private final FinanceProperties financeProperties;

    // ── Khởi tạo thanh toán ───────────────────────────────────────────────────

    /**
     * Khởi tạo thanh toán cho một Booking (lần đầu) hoặc thử lại (UC-03).
     *
     * <p>Quy tắc:
     * <ul>
     *   <li>Booking phải PENDING_PAYMENT và chưa quá hạn 10 phút.</li>
     *   <li>Nếu Booking đã được một giao dịch khác thanh toán thành công → không tạo attempt mới.</li>
     *   <li>Nếu có attempt trước chưa rõ kết quả (PENDING / PROCESSING) → QueryDR trước;
     *       nếu vẫn chưa rõ thì KHÔNG cho tạo attempt mới (tránh thanh toán trùng).</li>
     *   <li>Mỗi attempt có {@code txnRef} riêng; hạn thanh toán = {@code paymentDeadline} cố định
     *       của Booking (không gia hạn).</li>
     * </ul>
     */
    @Transactional
    public PaymentInitResponse initiatePayment(Long bookingId, Long touristId, String clientIp) {
        return initiatePayment(bookingId, touristId, clientIp, null, false);
    }

    /**
     * Khởi tạo thanh toán với phương thức thanh toán do khách chọn (tuỳ chọn).
     *
     * @param bankCode mã {@code vnp_BankCode} khách chọn (VD {@code VNPAYQR}, {@code VNBANK},
     *                 {@code VISA}, hoặc mã ngân hàng cụ thể). Null/rỗng → KHÔNG gửi
     *                 {@code vnp_BankCode} → khách chọn phương thức trên trang VNPay.
     */
    @Transactional
    public PaymentInitResponse initiatePayment(Long bookingId, Long touristId, String clientIp, String bankCode) {
        return initiatePayment(bookingId, touristId, clientIp, bankCode, false);
    }

    /**
     * Khởi tạo thanh toán — bản đầy đủ.
     *
     * @param appRedirect true khi client là APP MOBILE ⇒ Return URL được gắn
     *                    {@code app_redirect=1} ⇒ trình duyệt sau khi thanh toán sẽ
     *                    chuyển hướng về app (deep link) thay vì chỉ hiện trang kết quả.
     */
    @Transactional
    public PaymentInitResponse initiatePayment(Long bookingId, Long touristId, String clientIp,
                                                String bankCode, boolean appRedirect) {
        Booking booking = bookingService.findOrThrow(bookingId);
        checkOwnership(booking, touristId);

        if (booking.getStatus() == BookingStatus.CONFIRMED || booking.getStatus() == BookingStatus.COMPLETED) {
            throw new AppException(ErrorCode.PAYMENT_ALREADY_SUCCEEDED,
                    "Booking đã được thanh toán thành công — không cần tạo giao dịch mới");
        }
        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            throw new AppException(ErrorCode.BOOKING_INVALID_STATUS_FOR_CANCEL,
                    "Booking đang ở trạng thái " + booking.getStatus() + " — không thể thanh toán");
        }

        // UC-01: nếu đã quá hạn thì chuyển EXPIRED + giải phóng slot, không cho tạo attempt mới.
        if (booking.isDeadlinePassed(Instant.now())) {
            bookingService.expireIfNeededInCurrentTransaction(bookingId);
            throw new AppException(ErrorCode.BOOKING_ALREADY_EXPIRED,
                    "Booking đã hết hạn thanh toán (10 phút) — không thể tạo giao dịch mới");
        }

        // UC-04: nếu đã có giao dịch thành công dùng để xác nhận Booking → chặn.
        if (paymentRepository.existsByBooking_IdAndStatus(bookingId, PaymentStatus.SUCCESS)) {
            throw new AppException(ErrorCode.PAYMENT_ALREADY_SUCCEEDED,
                    "Booking đã có giao dịch thanh toán thành công");
        }

        // UC-03: nếu lần thử trước chưa rõ kết quả → QueryDR trước khi cho tạo attempt mới.
        List<Payment> previous = paymentRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId);
        for (Payment attempt : previous) {
            if (attempt.getStatus() == PaymentStatus.PENDING || attempt.getStatus() == PaymentStatus.PROCESSING) {
                PaymentOutcome outcome = verifyWithVnPay(attempt, clientIp);
                if (outcome == PaymentOutcome.SUCCESS || outcome == PaymentOutcome.DUPLICATE) {
                    throw new AppException(ErrorCode.PAYMENT_ALREADY_SUCCEEDED,
                            "Giao dịch trước đã được xác minh thành công — không thể tạo giao dịch mới");
                }
                if (outcome == PaymentOutcome.UNKNOWN) {
                    // ── UC-03: lần thử trước chưa rõ kết quả ──────────────────
                    // KHÔNG chặn vô điều kiện: QueryDR trên VNPay Sandbox luôn trả
                    // `vnp_ResponseCode=99` ("Unexpected error") ⇒ nếu chặn, khách
                    // KHÔNG BAO GIỜ thử lại được dù booking vẫn còn trong hạn 10 phút
                    // (dead-end). Đây chính là lỗi "bấm thanh toán lại bị báo
                    // PAYMENT_NOT_RETRYABLE" mà khách gặp phải.
                    //
                    // Vì sao vẫn AN TOÀN khi cho tạo attempt mới?
                    //  • Mỗi attempt có `txnRef` RIÊNG ⇒ nếu khách thanh toán cả hai
                    //    lần, ta nhận ra 2 giao dịch khác nhau ở VNPay.
                    //  • Giao dịch cũ vẫn ở PENDING/PROCESSING ⇒ khi callback/IPN/
                    //    Return về sau, nó sẽ được áp dụng bình thường.
                    //  • Nếu giao dịch cũ thực sự THÀNH CÔNG, `applyVnPayResult` →
                    //    `confirmBookingAfterVerifiedPayment` đánh dấu DUPLICATE cho
                    //    giao dịch dư ⇒ không xác nhận Booking 2 lần, không ghi nhận
                    //    doanh thu 2 lần (UC-04). Khoản tiền dư chuyển sang quy trình
                    //    hoàn tiền/đối soát ⇒ KHÔNG mất tiền của khách.
                    //
                    // ⇒ Vẫn QueryDR trước (để bắt được case đã thành công mà chưa
                    //   có callback), nhưng UNKNOWN chỉ mang tính cảnh báo, KHÔNG chặn.
                    log.warn("[Payment][UC-03] txnRef={} chưa xác minh được kết quả (QueryDR trả 99 trên Sandbox). "
                                    + "Vẫn cho tạo lần thử mới — booking còn trong hạn, giao dịch cũ sẽ được đối soát khi có callback.",
                            attempt.getTxnRef());
                    break;
                }
                // FAILED / CANCELLED rõ ràng → được phép tạo attempt mới.
                break;
            }
        }

        // ── Đóng các giao dịch cũ đã bị BỎ RƠI ────────────────────────────────
        // Giao dịch #1 (mở trình duyệt VNPay rồi quay lại app) bị bỏ rơi ở
        // PENDING/PROCESSING. Khi khách bấm "Thanh toán" LẦN 2, giao dịch #1
        // không còn ý nghĩa (khách đã quyết định thanh toán bằng giao dịch mới)
        // ⇒ đánh dấu SUPERSEDED để không treo vô thời hạn.
        //
        // ⚠️ Giao dịch cũ vẫn có thể "thành công" ở VNPay nếu khách hoàn tất ở
        // cửa sổ trình duyệt cũ ⇒ callback về sau sẽ được `applyVnPayResult`
        // xử lý ⇒ `confirmBookingAfterVerifiedPayment` đánh dấu DUPLICATE
        // (khoản tiền dư) ⇒ không xác nhận Booking 2 lần. KHÔNG mất tiền khách.
        supersedeStrandedAttempts(bookingId, previous);

        // ── Tạo Payment attempt mới ───────────────────────────────────────────
        Instant now = Instant.now();
        String txnRef = generateTxnRef(booking.getId());

        // Cảnh báo sớm nếu chưa khai báo IPN URL — IPN là nguồn xác minh chính,
        // thiếu nó thì Payment sẽ kẹt ở PROCESSING (chỉ QueryDR mới cứu được).
        if (vnPayProperties.getIpnUrl() == null || vnPayProperties.getIpnUrl().isBlank()) {
            log.warn("[VNPay] VNPAY_IPN_URL chưa được cấu hình — VNPay sẽ không gọi được webhook "
                    + "cập nhật trạng thái thanh toán. Hãy đặt URL public (vd ngrok) rồi restart app.");
        }

        BigDecimal amount = booking.getTotalAmount() != null ? booking.getTotalAmount() : BigDecimal.ZERO;

        String orderInfo = buildOrderInfo(booking);
        LocalDateTime createDate = LocalDateTime.ofInstant(now, VIETNAM_ZONE);
        // Hạn thanh toán cố định theo Booking — KHÔNG gia hạn khi thử lại.
        LocalDateTime expireDate = LocalDateTime.ofInstant(booking.getPaymentDeadline(), VIETNAM_ZONE);

        // Dự án chỉ hỗ trợ "Thẻ nội địa và tài khoản ngân hàng" (VNBANK).
        // Nếu client KHÔNG gửi bankCode ⇒ mặc định dùng VNBANK, KHÔNG để trống —
        // vì URL không có vnp_BankCode sẽ mở trang "chọn phương thức" của VNPay
        // (có cả QR + thẻ quốc tế) — trái với quy ước đã thống nhất.
        String effectiveBankCode = (bankCode != null && !bankCode.isBlank())
                ? bankCode.trim()
                : PaymentMethodService.SUPPORTED_METHOD.getBankCode();

        String paymentUrl = vnPayClient.buildPaymentUrl(txnRef, amount, orderInfo,
                createDate, expireDate, clientIp, effectiveBankCode, appRedirect);

        Payment payment = paymentRepository.save(Payment.builder()
                .booking(booking)
                .txnRef(txnRef)
                .method(com.journeygo.modules.payment.entity.enums.PaymentMethod.VNPAY)
                .status(PaymentStatus.PENDING)
                .amount(amount)
                .currency(booking.getCurrency())
                .expiresAt(booking.getPaymentDeadline())
                .paymentUrl(paymentUrl)
                .build());

        log.info("[Payment] Khởi tạo thanh toán id={} txnRef={} booking={} amount={} bankCode={}",
                payment.getId(), txnRef, booking.getId(), amount, effectiveBankCode);

        return PaymentInitResponse.builder()
                .paymentId(payment.getId())
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .txnRef(txnRef)
                .amount(amount)
                .currency(booking.getCurrency())
                .paymentUrl(paymentUrl)
                .expiresAt(booking.getPaymentDeadline())
                .selectedBankCode((bankCode != null && !bankCode.isBlank()) ? bankCode : null)
                .availableMethods(paymentMethodService.getPaymentMethods().methods())
                .message("Chọn phương thức thanh toán (Ứng dụng ngân hàng & ví điện tử / Thẻ nội địa & tài khoản "
                        + "ngân hàng / Thẻ thanh toán quốc tế) trên trang VNPay. "
                        + "Số tiền: " + amount.toPlainString() + " " + booking.getCurrency()
                        + " — Mã đơn: " + booking.getBookingCode())
                .build();
    }

    // ── IPN / Return ──────────────────────────────────────────────────────────

    /**
     * Xử lý IPN (server-to-server) từ VNPay.
     *
     * <p>Đây là nguồn xác minh ĐÁNG TIN CẬY. Trả về đúng theo giao thức VNPay:
     * {@code {"RspCode": "00", "Message": "..."}} khi đã cập nhật thành công.
     *
     * <p><b>Mã RspCode theo tài liệu VNPay:</b>
     * <ul>
     *   <li>{@code 00} — đã cập nhật thành công → VNPay kết thúc luồng, KHÔNG retry.</li>
     *   <li>{@code 02} — đã cập nhật trước đó (callback trùng) → VNPay kết thúc luồng.</li>
     *   <li>{@code 01}/{@code 04}/{@code 97}/{@code 99} — lỗi → VNPay retry tối đa 1 lần.</li>
     * </ul>
     *
     * <p>UC-04 — callback trùng: nếu giao dịch đã được xử lý thành công trước đó, KHÔNG xác nhận
     * lại Booking và KHÔNG ghi nhận doanh thu lần thứ hai; chỉ tăng bộ đếm IPN để đối soát.
     */
    @Transactional
    public Map<String, Object> processIpn(Map<String, String> params) {
        if (!vnPayClient.isValidSignature(params)) {
            log.warn("[Payment][IPN] Chữ ký không hợp lệ — từ chối xử lý.");
            return ipnResponse("97", "Invalid signature");
        }

        String txnRef = params.get("vnp_TxnRef");
        if (txnRef == null || txnRef.isBlank()) {
            return ipnResponse("99", "Missing vnp_TxnRef");
        }

        Payment payment = paymentRepository.findByTxnRefForUpdate(txnRef).orElse(null);
        if (payment == null) {
            log.warn("[Payment][IPN] Không tìm thấy payment với txnRef={}", txnRef);
            return ipnResponse("99", "Transaction not found");
        }

        payment.setIpnCount(payment.getIpnCount() + 1);
        paymentRepository.save(payment);

        PaymentOutcome outcome = applyVnPayResult(payment, params, "IPN");
        log.info("[Payment][IPN] txnRef={} kết quả={} ipnCount={}", txnRef, outcome, payment.getIpnCount());

        // IPN trả "00" (Success) khi đã cập nhật thành công — kể cả khi là callback trùng,
        // vì trạng thái đã đúng và VNPay cần biết là đã nhận.
        return ipnResponse("00", "Confirm Success");
    }

    /**
     * Đóng gói phản hồi IPN đúng chuẩn VNPay.
     *
     * <p>VNPay đọc {@code RspCode} + {@code Message} (đúng chữ hoa) để quyết định
     * kết thúc hay retry luồng IPN. Trả về CẢ {@code RspCode}/{@code Message} (chuẩn)
     * lẫn {@code code}/{@code message} (tương thích ngược) để tiện cho việc debug.
     *
     * @param rspCode mã trạng thái: {@code 00}, {@code 02}, {@code 01}, {@code 04}, {@code 97}, {@code 99}
     * @param message mô tả ngắn bằng tiếng Anh (VNPay yêu cầu message tiếng Anh)
     */
    private Map<String, Object> ipnResponse(String rspCode, String message) {
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("RspCode", rspCode);
        response.put("Message", message);
        // Alias tương thích ngược (log/đối soát nội bộ).
        response.put("code", rspCode);
        response.put("message", message);
        return response;
    }

    /**
     * Xử lý Return URL — người dùng được redirect về sau khi thanh toán.
     *
     * <p>── Vì sao KHÔNG được bỏ qua rồi đi QueryDR? ──
     * <ul>
     *   <li>Return URL mang đầy đủ kết quả giao dịch ({@code vnp_ResponseCode},
     *       {@code vnp_TransactionStatus}, {@code vnp_TransactionNo}, {@code vnp_PayDate}…)
     *       kèm <b>chữ ký HMACSHA512 của VNPay</b>. Sau khi kiểm tra chữ ký hợp lệ,
     *       đây là bằng chứng có giá trị — KHÔNG cần gọi thêm API nào.</li>
     *   <li>Trong khi đó, lệnh {@code querydr} của VNPay Sandbox đang trả
     *       {@code vnp_ResponseCode=99} ("Unexpected error") cho MỌI giao dịch —
     *       kể cả giao dịch đã thanh toán thành công (đã kiểm chứng trực tiếp
     *       với nhiều hình thức request). ⇒ Nếu bỏ qua kết quả trong Return URL để
     *       đi QueryDR, hệ thống sẽ kẹt ở PROCESSING vô thời hạn và khách không
     *       bao giờ thấy "thanh toán thành công".</li>
     * </ul>
     *
     * <p>⇒ Thứ tự xử lý: (1) kiểm tra chữ ký, (2) áp dụng kết quả trong Return URL,
     * (3) chỉ gọi QueryDR khi Return URL <b>không</b> mang kết quả rõ ràng
     * (ví dụ khách tự bấm "Hủy" trên trang VNPay, hoặc callback đến muộn).
     *
     * <p>Lưu ý bảo mật: Return URL là nơi người dùng có thể giả mạo, nhưng mọi
     * tham số đều được kiểm tra chữ ký trước khi áp dụng ⇒ không thể giả mạo
     * kết quả thành công.
     */
    @Transactional
    public PaymentVerificationResponse processReturn(Map<String, String> params, Long touristId, String clientIp) {
        if (!vnPayClient.isValidSignature(params)) {
            throw new AppException(ErrorCode.PAYMENT_INVALID_SIGNATURE,
                    "Chữ ký kết quả thanh toán không hợp lệ");
        }

        String txnRef = params.get("vnp_TxnRef");
        if (txnRef == null || txnRef.isBlank()) {
            throw new AppException(ErrorCode.PAYMENT_NOT_FOUND, "Thiếu mã giao dịch trong kết quả thanh toán");
        }

        Payment payment = paymentRepository.findByTxnRefForUpdate(txnRef)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

        if (touristId != null) {
            checkOwnership(payment.getBooking(), touristId);
        }

        // ── Kiểm tra số tiền khớp với đơn hàng ───────────────────────────────
        // Chữ ký hợp lệ KHÔNG đủ: kết quả trả về có thể là của một giao dịch khác
        // (VD khách mở nhiều tab VNPay). Nếu số tiền không khớp với đơn thì KHÔNG
        // được xác nhận Booking — trả về lỗi rõ ràng cho khách.
        verifyAmountMatchesBooking(payment, params);

        // Return URL ĐÃ ĐƯỢC VNPay KÝ ⇒ là nguồn xác minh ĐÁNG TIN CẬY.
        // Nếu nó nói rõ "thành công" thì phải ÁP DỤNG kết quả đó, bất kể trạng
        // thái hiện tại của giao dịch trong DB — nếu không, khách đã trả tiền
        // vẫn thấy "đang chờ thanh toán" (đúng triệu chứng đã gặp).
        //
        // ⚠️ `SUCCESS` là trạng thái cuối, áp dụng lại là idempotent (callback
        // trùng) ⇒ vẫn trả về luôn, không cần đi qua `applyVnPayResult`.
        boolean signedSuccess = VNPAY_RESPONSE_SUCCESS.equals(params.get("vnp_ResponseCode"))
                && VNPAY_STATUS_SUCCESS.equals(params.get("vnp_TransactionStatus"));

        // Nếu đã có kết quả rõ ràng → trả về luôn, không cần truy vấn lại.
        //
        // ⚠️ Ngoại lệ: `SUPERSEDED` (giao dịch bị thay thế) vẫn phải áp dụng kết quả
        // khi có Return URL ĐÃ KÝ — vì khách có thể đã hoàn tất thanh toán ở cửa sổ
        // trình duyệt CŨ ⇒ tiền ĐÃ trôi ⇒ phải ghi nhận thành công + đánh dấu
        // DUPLICATE (khoản tiền dư) để chuyển quy trình hoàn tiền/đối soát.
        //
        // ⚠️ `FAILED` / `CANCELLED` cũng KHÔNG được chặn khi Return URL đã ký
        // báo thành công: trạng thái cũ có thể đến từ một lần quét trước đó
        // (VD `markFailed` khi khách bấm hủy ở cửa sổ cũ rồi thực tế đã trả
        // tiền ở cửa sổ mới) ⇒ tiền đã trôi thì phải ghi nhận.
        boolean staleButSignedSuccess = signedSuccess
                && payment.getStatus() != PaymentStatus.SUCCESS;
        if (payment.getStatus().isFinal()
                && payment.getStatus() != PaymentStatus.SUPERSEDED
                && !staleButSignedSuccess) {
            return toVerificationResponse(payment, payment.isSuccess()
                    ? "Thanh toán thành công"
                    : "Thanh toán không thành công: " + (payment.getVnpMessage() != null ? payment.getVnpMessage() : ""));
        }

        // ── Kết quả trong Return URL đã được VNPay ký ⇒ áp dụng TRỰC TIẾP ──
        PaymentOutcome outcome = applyVnPayResult(payment, params, "Return");
        if (outcome != PaymentOutcome.UNKNOWN) {
            log.info("[Payment][Return] txnRef={} kết quả={} status={}",
                    payment.getTxnRef(), outcome, payment.getStatus());
            return toVerificationResponse(payment, payment.isSuccess()
                    ? "Thanh toán thành công"
                    : "Thanh toán không thành công: " + (payment.getVnpMessage() != null ? payment.getVnpMessage() : ""));
        }

        // Return URL không mang kết quả rõ ràng (VD khách bấm "Hủy" ở trang VNPay,
        // hoặc VNPay chưa gửi đủ tham số) ⇒ hỏi trực tiếp VNPay bằng QueryDR.
        PaymentOutcome queryOutcome = verifyWithVnPay(payment, clientIp);
        if (queryOutcome == PaymentOutcome.UNKNOWN) {
            // KHÔNG kết luận thất bại — giữ trạng thái chờ xác minh.
            payment.markProcessing();
            payment.setNote("Chưa xác minh được kết quả thanh toán — đang chờ xác minh thêm.");
            paymentRepository.save(payment);
            return toVerificationResponse(payment, "Chưa xác minh được kết quả thanh toán. Vui lòng kiểm tra lại sau.");
        }

        return toVerificationResponse(payment, payment.isSuccess()
                ? "Thanh toán thành công"
                : "Thanh toán không thành công: " + (payment.getVnpMessage() != null ? payment.getVnpMessage() : ""));
    }

    // ── Timeout / expiry ──────────────────────────────────────────────────────

    /**
     * Quét và đóng các giao dịch ĐÃ QUÁ HẠN thanh toán mà chưa có kết quả cuối cùng.
     *
     * <p>── Vì sao cần? ──
     * Giao dịch VNPay có hạn thanh toán 10 phút (cố định theo {@code paymentDeadline}
     * của Booking). Khách không hoàn tất thanh toán ⇒ giao dịch treo ở
     * {@code PENDING}/{@code PROCESSING}.
     *
     * <p>Tác vụ đối soá KHÔNG đóng được chúng vì QueryDR trên VNPay Sandbox luôn
     * trả {@code vnp_ResponseCode=99} ⇒ giao dịch treo VÔ THỜI HẠN và hiển thị
     * "Đang xử lý" hàng tháng trên trang Quản trị Tài chính, dù hạn thanh toán đã
     * qua từ lâu.
     *
     * <p>⇒ Chuyển sang {@code EXPIRED} — trạng thái đã có sẵn trong enum nhưng trước
     * đây KHÔNG có code nào gọi tới.
     *
     * <p>⚠️ KHÔNG mất tiền khách: {@code EXPIRED} KHÔNG nằm trong
     * {@code PaymentStatus.isFinal()} ⇒ khi callback/IPN đến muộn, kết quả vẫn được
     * áp dụng bình thường (thành công → xác nhận Booking hoặc đánh dấu khoản tiền
     * dư; thất bại → chuyển sang quy trình hoàn tiền/đối soát).
     *
     * @return số giao dịch vừa được chuyển sang EXPIRED
     */
    @Transactional
    public int expireOverduePayments() {
        Instant now = Instant.now();
        List<Payment> overdue = paymentRepository.findExpiredPendingPayments(
                List.of(PaymentStatus.PENDING, PaymentStatus.PROCESSING), now);
        if (overdue.isEmpty()) {
            return 0;
        }

        int count = 0;
        for (Payment payment : overdue) {
            // Khóa pessimistic write + kiểm tra lại trạng thái: một luồng khác
            // (IPN/callback) có thể vừa xác minh thành công ⇒ KHÔNG được ghi đè.
            Payment locked = paymentRepository.findByIdForUpdate(payment.getId()).orElse(null);
            if (locked == null) {
                continue;
            }
            if (locked.getStatus() != PaymentStatus.PENDING
                    && locked.getStatus() != PaymentStatus.PROCESSING) {
                continue;
            }
            if (!isReallyOverdue(locked, now)) {
                continue;
            }
            locked.markExpired("Giao dịch đã quá hạn thanh toán (hạn "
                    + locked.getExpiresAt() + ") và không có kết quả xác minh từ VNPay.");
            paymentRepository.save(locked);
            count++;
        }
        if (count > 0) {
            log.info("[Payment][Expiry] Đã chuyển {} giao dịch quá hạn thanh toán sang EXPIRED", count);
        }
        return count;
    }

    /**
     * Giao dịch đã quá hạn THẬT sự chưa? (quá hạn + đã qua khoảng lướt an toàn).
     *
     * <p>Khoảng lướt an toàn cho tác vụ đối soá (QueryDR) có cơ hội xác minh giao dịch
     * mà khách ĐÃ thanh toán thành công nhưng callback/IPN bị mất.
     */
    private boolean isReallyOverdue(Payment payment, Instant now) {
        if (payment.getExpiresAt() == null || !payment.getExpiresAt().isBefore(now)) {
            return false;
        }
        long graceSeconds = Math.max(0, financeProperties.getPaymentExpiryGraceSeconds());
        return !payment.getExpiresAt().plusSeconds(graceSeconds).isAfter(now);
    }

    /**
     * Đóng các giao dịch quá hạn thanh toán NGAY TRONG LÚC ĐỌC DANH SÁCH (lazy check).
     *
     * <p>── Vì sao cần thêm bước này? ──
     * Tác vụ nền {@link #expireOverduePayments()} quét mỗi 60 giây ⇒ có thể trễ tới
     * 1 phút. Nhưng người dùng thấy "Đang xử lý" cho một giao dịch đã hết hạn từ
     * 4 ngày trước là rất khó chịu ⇒ khi mở danh sách, quét luôn các giao dịch quá
     * hạn TRONG TRANG ĐANG XEM và đóng chúng ngay.
     *
     * <p>⚠️ Truy vấn theo tập payment của trang hiện tại (không quét toàn hệ thống)
     * ⇒ không gây tải nặng khi mở danh sách.
     *
     * @param payments các giao dịch đang hiển thị trong trang
     */
    private void closeExpiredPayments(List<Payment> payments) {
        if (payments == null || payments.isEmpty()) {
            return;
        }
        Instant now = Instant.now();
        for (Payment payment : payments) {
            if (payment.getStatus() != PaymentStatus.PENDING
                    && payment.getStatus() != PaymentStatus.PROCESSING) {
                continue;
            }
            if (!isReallyOverdue(payment, now)) {
                continue;
            }
            payment.markExpired("Giao dịch đã quá hạn thanh toán (hạn "
                    + payment.getExpiresAt() + ") và không có kết quả xác minh từ VNPay.");
            paymentRepository.save(payment);
            log.info("[Payment][Expiry] txnRef={} đã quá hạn thanh toán (hạn {}) — chuyển sang EXPIRED.",
                    payment.getTxnRef(), payment.getExpiresAt());
        }
    }

    // ── QueryDR ───────────────────────────────────────────────────────────────

    /**
     * Đối soát lại các giao dịch còn "kẹt" (PENDING / PROCESSING) với VNPay.
     *
     * <p>── Vì sao cần? ──
     * Giao dịch có thể kẹt ở PROCESSING vô thời hạn khi:
     * <ul>
     *   <li>IPN không tới (tunnel chết, IPN URL chưa khai báo trong VNPay Admin),</li>
     *   <li>app bị kill nên deep link không mở được ⇒ {@code /return-result} không được gọi,</li>
     *   <li>Request gửi lên backend bị từ chối (415, timeout…).</li>
     * </ul>
     * Khi đó khách ĐÃ thanh toán thành công nhưng hệ thống không biết ⇒ đơn vẫn hiện
     * nút "Thanh toán" và bấm vào lại sẽ báo "chưa xác minh được kết quả".
     *
     * <p>Tác vụ này quét lại các giao dịch kẹt và gọi QueryDR. LƯU Ý: trên VNPay
     * Sandbox, QueryDR luôn trả {@code vnp_ResponseCode=99} ⇒ không giải quyết được
     * gốc rễ. Vì vậy tác vụ chỉ giữ vai trò "lướt an toàn" cho môi trường thật
     * (nơi QueryDR hoạt động) và ghi log cảnh báo để Admin biết cần đối soát thủ công.
     *
     * @param maxPayments số giao dịch tối đa xử lý trong một lần quét (giới hạn tải)
     * @return số giao dịch đã được xác minh thành công
     */
    @Transactional
    public int reconcileStuckPayments(int maxPayments) {
        List<Payment> stuck = paymentRepository.findStuckPayments(
                List.of(PaymentStatus.PENDING, PaymentStatus.PROCESSING));
        if (stuck.isEmpty()) {
            return 0;
        }

        int resolved = 0;
        int scanned = 0;
        for (Payment payment : stuck) {
            if (scanned >= maxPayments) {
                log.info("[Payment][Reconcile] Đã quét tới giới hạn {} giao dịch — còn {} giao dịch chờ lượt sau.",
                        maxPayments, stuck.size() - scanned);
                break;
            }
            scanned++;

            try {
                // ── Booking đã được thanh toán bởi giao dịch khác ─────────────
                // Giao dịch này bị bỏ rơi ⇒ đóng lại thay vì hỏi VNPay (QueryDR
                // trên Sandbox luôn trả 99 ⇒ treo vô thời hạn).
                if (closeSupersededBecauseBookingPaid(payment)) {
                    resolved++;
                    log.info("[Payment][Reconcile] txnRef={} đã bị thay thế — booking đã được thanh toán bởi giao dịch khác.",
                            payment.getTxnRef());
                    continue;
                }

                PaymentOutcome outcome = verifyWithVnPay(payment, null);
                if (outcome == PaymentOutcome.SUCCESS || outcome == PaymentOutcome.DUPLICATE) {
                    resolved++;
                    log.info("[Payment][Reconcile] txnRef={} đã được đối soát thành công (outcome={}).",
                            payment.getTxnRef(), outcome);
                }
            } catch (Exception e) {
                // Một giao dịch lỗi không được làm hỏng cả lượt quét.
                log.warn("[Payment][Reconcile] Lỗi khi đối soát txnRef={}: {}",
                        payment.getTxnRef(), e.getMessage());
            }
        }

        if (scanned > 0) {
            log.info("[Payment][Reconcile] Đã quét {} giao dịch kẹt, xác minh thành công {}.",
                    scanned, resolved);
        }
        return resolved;
    }

    /**
     * Truy vấn trực tiếp VNPay về kết quả một giao dịch (vnp_Command=querydr).
     *
     * <p>Được dùng khi: cần xác minh giao dịch trước khi thử lại (UC-03),
     * thanh toán đến muộn (UC-05), hoặc Admin cần đối soát.
     */
    @Transactional
    public PaymentOutcome queryAndResolve(Long paymentId, String clientIp) {
        Payment payment = paymentRepository.findByIdForUpdate(paymentId)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));

        if (payment.getStatus().isFinal()) {
            if (payment.getStatus() == PaymentStatus.SUPERSEDED) {
                // Giao dịch bị thay thế ⇒ KHÔNG phải thất bại.
                return PaymentOutcome.SUPERSEDED;
            }
            return payment.isSuccess() ? PaymentOutcome.SUCCESS : PaymentOutcome.FAILED;
        }

        // ── Booking đã được thanh toán bởi giao dịch KHÁC ─────────────────────
        // Giao dịch này không có kết quả (khách bỏ rơi cửa sổ trình duyệt) và
        // đơn đã được thanh toán bằng giao dịch mới ⇒ đóng giao dịch này lại
        // thay vì hỏi VNPay (QueryDR trên Sandbox luôn trả 99 ⇒ treo vô thời hạn).
        if (closeSupersededBecauseBookingPaid(payment)) {
            return PaymentOutcome.SUPERSEDED;
        }

        PaymentOutcome outcome = verifyWithVnPay(payment, clientIp);
        log.info("[Payment][QueryDR] paymentId={} txnRef={} kết quả={}",
                paymentId, payment.getTxnRef(), outcome);
        return outcome;
    }

    /**
     * Gọi QueryDR và áp dụng kết quả lên Payment.
     *
     * <p>Trả về {@link PaymentOutcome#UNKNOWN} khi không xác định được kết quả
     * (timeout / lỗi mạng / mã phản hồi không hợp lệ) — khi đó KHÔNG được kết luận thất bại.
     */
    private PaymentOutcome verifyWithVnPay(Payment payment, String clientIp) {
        payment.setQueryCount(payment.getQueryCount() + 1);

        if (!vnPayProperties.isConfigured()) {
            log.warn("[Payment] VNPay chưa cấu hình — không thể xác minh giao dịch {}", payment.getTxnRef());
            paymentRepository.save(payment);
            return PaymentOutcome.UNKNOWN;
        }

        String transactionDate = payment.getCreatedAt() != null
                ? vnPayClient.formatDate(LocalDateTime.ofInstant(payment.getCreatedAt(), VIETNAM_ZONE))
                : null;
        String orderInfo = "Xac minh giao dich " + payment.getTxnRef();

        Map<String, String> response = vnPayClient.queryTransaction(
                payment.getTxnRef(),
                payment.getVnpTransactionNo(),
                transactionDate,
                orderInfo,
                clientIp);

        if (response == null || response.isEmpty()) {
            paymentRepository.save(payment);
            return PaymentOutcome.UNKNOWN;
        }

        return applyVnPayResult(payment, response, "QueryDR");
    }

    /**
     * Áp dụng kết quả từ VNPay (IPN / Return / QueryDR) lên Payment + Booking.
     *
     * <p>Đây là nơi xử lý trung tâm của UC-04 (duplicate) và UC-05 (late payment).
     */
    private PaymentOutcome applyVnPayResult(Payment payment, Map<String, String> result, String source) {
        String responseCode = result.get("vnp_ResponseCode");
        String transactionStatus = result.get("vnp_TransactionStatus");
        String message = result.get("vnp_Message");
        String transactionNo = result.get("vnp_TransactionNo");
        String bankTranNo = result.get("vnp_BankTranNo");
        String bankCode = result.get("vnp_BankCode");
        String cardType = result.get("vnp_CardType");
        String payDate = result.get("vnp_PayDate");

        boolean requestOk = VNPAY_RESPONSE_SUCCESS.equals(responseCode);
        boolean txSuccess = VNPAY_STATUS_SUCCESS.equals(transactionStatus);

        // ── Khách hủy giao dịch trên trang VNPay ───────────────────────────────
        // VNPay trả `vnp_ResponseCode=24` + `vnp_TransactionStatus=02` khi khách bấm
        // "Hủy" (đã kiểm chứng trên Sandbox). Đây là KẾT QUẢ RÕ RÀNG ⇒ giao dịch
        // thất bại, KHÔNG phải "chưa rõ" — nếu coi là chưa rõ thì giao dịch kẹt
        // ở PROCESSING vô thời hạn và khách không bao giờ được thử lại.
        if (VNPAY_RESPONSE_CANCELLED.equals(responseCode)) {
            payment.setVnpResponseCode(responseCode);
            payment.setVnpTransactionStatus(transactionStatus);
            payment.markCancelled(responseCode, transactionStatus, message != null && !message.isBlank()
                    ? message
                    : "Khách hàng đã hủy giao dịch thanh toán.");
            paymentRepository.save(payment);
            log.info("[Payment][{}] txnRef={} khách hủy giao dịch (ResponseCode={}).",
                    source, payment.getTxnRef(), responseCode);
            return PaymentOutcome.CANCELLED;
        }

        if (!requestOk) {
            // Không xác định được kết quả giao dịch (mã phản hồi lỗi) → giữ trạng thái chờ.
            payment.setVnpResponseCode(responseCode);
            payment.setVnpTransactionStatus(transactionStatus);
            payment.setVnpMessage(message);
            if (payment.getStatus() != PaymentStatus.SUCCESS) {
                payment.markProcessing();
            }
            paymentRepository.save(payment);
            log.warn("[Payment][{}] txnRef={} ResponseCode={} Message={} — chưa xác minh được kết quả.",
                    source, payment.getTxnRef(), responseCode, message);
            return PaymentOutcome.UNKNOWN;
        }

        if (!txSuccess) {
            // Trạng thái giao dịch rõ ràng: thất bại / đang xử lý / bị nghi ngờ gian lận.
            boolean definitiveFailure = VNPAY_STATUS_FAILED.equals(transactionStatus)
                    || VNPAY_STATUS_SUSPECTED_FRAUD.equals(transactionStatus)
                    || VNPAY_STATUS_REFUND_REJECTED.equals(transactionStatus);

            payment.setVnpResponseCode(responseCode);
            payment.setVnpTransactionStatus(transactionStatus);
            payment.setVnpMessage(message);
            if (transactionNo != null && !transactionNo.isBlank()) {
                payment.setVnpTransactionNo(transactionNo);
            }

            if (definitiveFailure) {
                payment.markFailed(responseCode, transactionStatus, message);
                paymentRepository.save(payment);
                log.info("[Payment][{}] txnRef={} thất bại đã xác minh (status={}).",
                        source, payment.getTxnRef(), transactionStatus);
                return PaymentOutcome.FAILED;
            }

            // 01 (chưa hoàn tất) / 05 (đang xử lý) / 06 (đã gửi ngân hàng) → chưa rõ.
            payment.markProcessing();
            payment.setNote("VNPay đang xử lý giao dịch (vnp_TransactionStatus=" + transactionStatus + ").");
            paymentRepository.save(payment);
            return PaymentOutcome.UNKNOWN;
        }

        // ── Giao dịch THÀNH CÔNG ──────────────────────────────────────────────
        Instant paidAt = parseVnPayDate(payDate);
        if (paidAt == null) {
            paidAt = payment.getPaidAt() != null ? payment.getPaidAt() : Instant.now();
        }

        // UC-04 — Callback trùng: giao dịch đã SUCCESS rồi → không xác nhận lại.
        if (payment.getStatus() == PaymentStatus.SUCCESS) {
            payment.setNote("Callback trùng — giao dịch đã được xử lý thành công trước đó.");
            paymentRepository.save(payment);
            log.info("[Payment][{}] txnRef={} callback trùng — bỏ qua, không ghi nhận lại.",
                    source, payment.getTxnRef());
            return PaymentOutcome.DUPLICATE;
        }

        payment.markSuccess(paidAt, transactionNo, bankTranNo, bankCode, responseCode, transactionStatus, message);
        if (cardType != null && !cardType.isBlank()) {
            payment.setCardType(cardType);
        }
        paymentRepository.save(payment);

        return confirmBookingAfterVerifiedPayment(payment, paidAt);
    }

    /**
     * Xác nhận Booking sau khi Payment đã được xác minh thành công.
     *
     * <p>Xử lý đồng thời UC-04 (hai giao dịch cùng thành công) và UC-05 (thanh toán đến muộn).
     */
    private PaymentOutcome confirmBookingAfterVerifiedPayment(Payment payment, Instant paidAt) {
        Booking booking = bookingRepository.findByIdForUpdate(payment.getBooking().getId()).orElse(null);
        if (booking == null) {
            log.error("[Payment] Không tìm thấy booking {} của payment {}", payment.getBooking().getId(), payment.getId());
            return PaymentOutcome.SUCCESS;
        }

        // UC-04 — Booking đã được giao dịch khác thanh toán → giao dịch này là "khoản tiền dư".
        if (booking.getStatus() == BookingStatus.CONFIRMED || booking.getStatus() == BookingStatus.COMPLETED) {
            payment.setDuplicatePayment(true);
            payment.setNote("Thanh toán trùng: Booking đã được giao dịch khác thanh toán thành công. "
                    + "Khoản tiền này được giữ lại để chuyển sang quy trình hoàn tiền/đối soát.");
            paymentRepository.save(payment);
            log.warn("[Payment] txnRef={} là khoản tiền DƯ — booking {} đã được thanh toán bởi giao dịch khác.",
                    payment.getTxnRef(), booking.getId());
            return PaymentOutcome.DUPLICATE;
        }

        if (booking.getStatus() != BookingStatus.PENDING_PAYMENT) {
            // Booking đã EXPIRED / CANCELLED — UC-05.
            return handleLatePayment(booking, payment, paidAt);
        }

        // UC-05 — thanh toán thực tế có trước hạn không?
        boolean paidBeforeDeadline = paidAt != null && booking.getPaymentDeadline() != null
                && !paidAt.isAfter(booking.getPaymentDeadline());

        if (!paidBeforeDeadline) {
            return handleLatePayment(booking, payment, paidAt);
        }

        // Thanh toán đúng hạn → xác nhận Booking.
        booking.confirm(paidAt);
        bookingRepository.save(booking);

        // Ghi nhận doanh thu ProviderProfile — CHỈ ghi nhận một lần cho giao dịch này.
        recordProviderRevenue(booking, payment);
        notifyBookingConfirmed(booking, payment);

        log.info("[Payment] Đã xác nhận booking {} sau khi xác minh thanh toán (txnRef={}, paidAt={}).",
                booking.getId(), payment.getTxnRef(), paidAt);
        return PaymentOutcome.SUCCESS;
    }

    /**
     * Đóng các giao dịch bị BỎ RƠI thuộc về Booking đã được thanh toán.
     *
     * <p>Dùng khi đọc DANH SÁCH giao dịch: các giao dịch treo ở PENDING/PROCESSING
     * của một Booking đã {@code CONFIRMED}/{@code COMPLETED} được đánh dấu
     * {@code SUPERSEDED} ⇒ danh sách không còn hiển thị "đang chờ" cho đơn đã mua.
     *
     * <p>⚠️ Truy vấn theo tập booking của trang hiện tại (không quét toàn hệ thống)
     * ⇒ không gây tải nặng khi mở danh sách.
     *
     * @param payments các giao dịch đang hiển thị trong trang
     */
    private void closeStrandedOfPaidBookings(List<Payment> payments) {
        if (payments == null || payments.isEmpty()) {
            return;
        }
        List<Long> bookingIds = payments.stream()
                .map(p -> p.getBooking() != null ? p.getBooking().getId() : null)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        if (bookingIds.isEmpty()) {
            return;
        }
        List<Payment> stranded = paymentRepository.findStrandedPaymentsOfPaidBookings(
                bookingIds, List.of(PaymentStatus.PENDING, PaymentStatus.PROCESSING));
        for (Payment payment : stranded) {
            payment.markSuperseded("Giao dịch đã bị thay thế: đơn hàng đã được thanh toán thành công "
                    + "bởi một giao dịch khác.");
            paymentRepository.save(payment);
            log.info("[Payment] txnRef={} đã bị thay thế — booking {} đã được thanh toán bởi giao dịch khác.",
                    payment.getTxnRef(), payment.getBooking().getId());
        }
    }

    /**
     * Đóng các giao dịch cũ đã bị BỎ RƠI (chưa có kết quả) khi khách tạo giao dịch mới.
     *
     * <p>── Bối cảnh ──
     * Khách bấm "Thanh toán" (giao dịch #1) ⇒ mở trình duyệt VNPay ⇒ quay lại app
     * mà KHÔNG thanh toán ⇒ bấm "Thanh toán" lần nữa (giao dịch #2) ⇒ thành công.
     * Giao dịch #1 không có callback/IPN nào tới ⇒ treo ở {@code PENDING} vô thời hạn.
     * Bấm "Kiểm tra lại" ⇒ QueryDR trên Sandbox trả {@code 99} ⇒ UI hiện
     * "Đang chờ kết quả thanh toán" mãi mãi dù đơn đã được thanh toán.
     *
     * <p>⇒ Khi khách tạo giao dịch MỚI, các giao dịch cũ chưa có kết quả bị đánh dấu
     * {@code SUPERSEDED} ⇒ chúng KHÔNG còn hiện "đang chờ" nữa.
     *
     * <p>⚠️ An toàn: nếu giao dịch cũ thực sự thành công ở VNPay (khách hoàn tất ở
     * cửa sổ trình duyệt cũ), callback về sau vẫn được {@code applyVnPayResult}
     * xử lý ⇒ {@code confirmBookingAfterVerifiedPayment} đánh dấu DUPLICATE
     * (khoản tiền dư) ⇒ KHÔNG xác nhận Booking 2 lần, KHÔNG ghi nhận doanh thu
     * 2 lần ⇒ không mất tiền của khách.
     *
     * @param bookingId booking đang tạo giao dịch mới
     * @param attempts  danh sách giao dịch của booking (đã tải sẵn)
     */
    private void supersedeStrandedAttempts(Long bookingId, List<Payment> attempts) {
        for (Payment attempt : attempts) {
            if (attempt.getStatus() != PaymentStatus.PENDING
                    && attempt.getStatus() != PaymentStatus.PROCESSING) {
                continue;
            }
            attempt.markSuperseded("Giao dịch đã bị thay thế: khách tạo giao dịch mới cho cùng đơn hàng "
                    + "(booking " + bookingId + ").");
            paymentRepository.save(attempt);
            log.info("[Payment] txnRef={} đã bị thay thế (booking {} đã có giao dịch mới) — "
                            + "không còn hiển thị 'đang chờ kết quả thanh toán'.",
                    attempt.getTxnRef(), bookingId);
        }
    }

    /**
     * Đóng các giao dịch còn "kẹt" khi Booking ĐÃ được thanh toán bởi giao dịch khác.
     *
     * <p>── Vì sao cần? ──
     * Kịch bản: khách thanh toán thành công ở giao dịch #2 ⇒ Booking chuyển
     * {@code CONFIRMED}. Giao dịch #1 (bị bỏ rơi) vẫn treo ở {@code PENDING}.
     * Khi khách bấm "Kiểm tra lại" trên giao dịch #1, hệ thống phải nhận ra
     * "đơn này đã được thanh toán rồi" chứ không phải "đang chờ kết quả".
     *
     * <p>⇒ Gọi từ {@link #queryAndResolve(Long, String)} TRƯỚC khi hỏi VNPay:
     * nếu Booking đã {@code CONFIRMED}/{@code COMPLETED} mà giao dịch này chưa có
     * kết quả ⇒ đóng nó lại (SUPERSEDED) ⇒ trả về kết quả DỨT KHOÁT.
     *
     * @return {@code true} nếu giao dịch đã bị đóng vì Booking đã được thanh toán
     */
    private boolean closeSupersededBecauseBookingPaid(Payment payment) {
        if (payment.getStatus() != PaymentStatus.PENDING
                && payment.getStatus() != PaymentStatus.PROCESSING) {
            return false;
        }
        Booking booking = payment.getBooking();
        if (booking == null) {
            return false;
        }
        BookingStatus bookingStatus = booking.getStatus();
        if (bookingStatus != BookingStatus.CONFIRMED && bookingStatus != BookingStatus.COMPLETED) {
            return false;
        }
        // Booking đã được thanh toán ⇒ giao dịch này (chưa có kết quả) bị thay thế.
        payment.markSuperseded("Giao dịch đã bị thay thế: đơn hàng đã được thanh toán thành công "
                + "bởi một giao dịch khác.");
        paymentRepository.save(payment);
        log.info("[Payment] txnRef={} đã bị thay thế — booking {} đã được thanh toán bởi giao dịch khác.",
                payment.getTxnRef(), booking.getId());
        return true;
    }

    /**
     * Ghi nhận doanh thu ProviderProfile cho Booking vừa được xác nhận.
     *
     * <p>Idempotent — bản ghi doanh thu được tạo/cập nhật theo cặp (Booking, ProviderProfile), nên
     * callback trùng (UC-04) không tạo ra doanh thu lần thứ hai.
     */
    private void recordProviderRevenue(Booking booking, Payment payment) {
        try {
            providerRevenueService.recordRevenueForBooking(booking, payment);
        } catch (Exception e) {
            // Không để lỗi ghi nhận doanh thu làm hỏng luồng thanh toán đã xác minh.
            // Tác vụ nền / đánh giá lại sẽ xử lý.
            log.error("[Payment] Lỗi khi ghi nhận doanh thu cho booking {}: {}",
                    booking.getId(), e.getMessage(), e);
        }
    }

    /**
     * Xử lý thanh toán đến muộn (UC-05).
     *
     * <p>Quy tắc:
     * <ul>
     *   <li>Ghi nhận giao dịch thành công — KHÔNG bỏ qua khoản tiền đã nhận.</li>
     *   <li>KHÔNG tự động xác nhận Booking đã hết hạn.</li>
     *   <li>Kiểm tra khả năng giữ lại slot: nếu slot vẫn còn chỗ thì có thể xác nhận lại Booking
     *       (với chính sách cho phép), nếu không thì chuyển sang quy trình hoàn tiền.</li>
     * </ul>
     */
    private PaymentOutcome handleLatePayment(Booking booking, Payment payment, Instant paidAt) {
        boolean canReconfirm = canReacquireCapacity(booking);

        if (canReconfirm) {
            booking.confirm(paidAt);
            bookingRepository.save(booking);
            recordProviderRevenue(booking, payment);
            notifyBookingConfirmed(booking, payment);
            payment.setNote("Thanh toán đến muộn nhưng vẫn còn chỗ — đã xác nhận lại Booking.");
            paymentRepository.save(payment);
            log.info("[Payment] Thanh toán đến muộn nhưng còn sức chứa — xác nhận lại booking {}.",
                    booking.getId());
            return PaymentOutcome.SUCCESS;
        }

        // Không còn chỗ → chuyển sang quy trình tài chính / hoàn tiền.
        payment.setNote("Thanh toán đến muộn: Booking đã hết hạn và không còn sức chứa để giữ lại slot. "
                + "Khoản tiền được ghi nhận và chuyển sang quy trình hoàn tiền/đối soát.");
        paymentRepository.save(payment);
        log.warn("[Payment] Thanh toán đến muộn và không còn sức chứa — booking {} chuyển sang quy trình hoàn tiền.",
                booking.getId());
        notifications.send(NotificationType.PAYMENT_SUCCESS)
                .to(booking.getTourist() == null ? null : booking.getTourist().getId())
                .title("Đã nhận tiền nhưng tour đã hết chỗ")
                .body("Đơn " + booking.getBookingCode() + ": khoản " + NotificationPublisher.money(payment.getAmount())
                        + " đến sau hạn giữ chỗ và tour không còn chỗ trống. JourneyGo sẽ liên hệ để hoàn tiền cho bạn.")
                .ref("BOOKING", booking.getId())
                .queue(NotificationPublisher.Queue.BOOKINGS)
                .publish();
        return PaymentOutcome.SUCCESS;
    }

    /** Booking vừa được xác nhận sau thanh toán: báo du khách, đối tác sở hữu tour và làm mới bảng của Admin. */
    private void notifyBookingConfirmed(Booking booking, Payment payment) {
        String tourTitle = booking.getTour() != null ? booking.getTour().getTitle() : "tour";
        String date = booking.getExperienceDate() == null ? ""
                : " ngày " + booking.getExperienceDate().format(java.time.format.DateTimeFormatter.ofPattern("dd/MM/yyyy"));

        notifications.send(NotificationType.PAYMENT_SUCCESS)
                .to(booking.getTourist() == null ? null : booking.getTourist().getId())
                .title("Thanh toán thành công")
                .body("Đơn " + booking.getBookingCode() + " — " + NotificationPublisher.quote(tourTitle) + date
                        + " đã được xác nhận. Chúc bạn một hành trình thật đáng nhớ!")
                .ref("BOOKING", booking.getId())
                .queue(NotificationPublisher.Queue.BOOKINGS)
                .publish();

        var owner = booking.getTour() != null ? booking.getTour().getCreatedBy() : null;
        String touristName = booking.getTourist() != null ? booking.getTourist().getFullName() : "Du khách";
        notifications.send(NotificationType.BOOKING_RECEIVED)
                .to(NotificationPublisher.idOf(owner))
                .title("Có đơn đặt tour mới")
                .body(touristName + " vừa đặt " + NotificationPublisher.quote(tourTitle) + date + " — "
                        + NotificationPublisher.money(payment.getAmount()) + ".")
                .link(NotificationPublisher.dashboardPath(owner, owner != null && owner.getRole() != null
                        && owner.getRole().isAdmin() ? "/bookings" : ""))
                .ref("BOOKING", booking.getId())
                .queue(NotificationPublisher.Queue.BOOKINGS)
                .publish();
        notifications.queueChanged(Role.ADMIN, NotificationPublisher.Queue.BOOKINGS);
    }

    /**
     * Kiểm tra slot của Booking còn đủ chỗ để giữ lại không.
     *
     * <p>Chỉ trả về true khi:
     * <ul>
     *   <li>Booking vẫn còn giữ slot (chưa giải phóng) — nghĩa là chưa bị chuyển EXPIRED.</li>
     *   <li>Tất cả slot vẫn còn chỗ trống (không bị người khác chiếm).</li>
     * </ul>
     */
    private boolean canReacquireCapacity(Booking booking) {
        List<com.journeygo.modules.booking.entity.BookingSlotHold> holds =
                booking.getSlotHolds() == null ? List.of() : booking.getSlotHolds();
        if (holds.isEmpty()) {
            return false;
        }
        for (var hold : holds) {
            if (hold.isReleased()) {
                // Slot đã được giải phóng → có thể đã có người khác giữ.
                return false;
            }
            int count = Math.max(1, hold.getSlotCount());

            // ⚠️ Tour luồng 5 bước giữ chỗ trên TourSlot (capacity/bookedCount),
            //     còn tour luồng cũ giữ chỗ trên ExperienceSlot (maxTourPerDay).
            //     Trước đây chỉ kiểm tra ExperienceSlot ⇒ với wizard tour
            //     `getExperienceSlot()` luôn null ⇒ canReacquireCapacity luôn false
            //     ⇒ thanh toán đến muộn LUÔN rơi vào nhánh "không còn sức chứa".
            var tourSlot = hold.getTourSlot();
            if (tourSlot != null) {
                if (tourSlot.getStatus() != com.journeygo.modules.tour.entity.TourSlotStatus.OPEN) {
                    return false;
                }
                if (tourSlot.getCapacity() == null || tourSlot.getBookedCount() == null) {
                    return false;
                }
                // bookedCount đã bao gồm chỗ của booking này ⇒ sức chứa còn trống
                // là capacity - bookedCount + count (phần của chính booking đang giữ).
                if (tourSlot.getCapacity() - tourSlot.getBookedCount() + count < count) {
                    return false;
                }
                continue;
            }

            var slot = hold.getExperienceSlot();
            if (slot == null) {
                return false;
            }
            if (slot.getMaxTourPerDay() == null || slot.getBookedTourCount() == null
                    || slot.getBookedTourCount() >= slot.getMaxTourPerDay()) {
                return false;
            }
        }
        return true;
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional
    public PaymentResponse getById(Long paymentId, Long callerId, boolean isAdmin) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));
        if (!isAdmin) {
            checkOwnership(payment.getBooking(), callerId);
        }
        // Đối soát trước khi trả về: nếu Booking đã được thanh toán bởi giao dịch
        // khác mà giao dịch này chưa có kết quả ⇒ đóng lại (SUPERSEDED) để app
        // KHÔNG hiện "Đang chờ kết quả thanh toán" nữa.
        closeSupersededBecauseBookingPaid(payment);
        // Giao dịch đã quá hạn thanh toán mà chưa có kết quả ⇒ chuyển sang EXPIRED
        // (để UI không hiện "Đang xử lý" cho giao dịch đã hết hạn từ lâu).
        closeExpiredPayments(List.of(payment));
        return PaymentResponse.fromEntity(payment);
    }

    @Transactional
    public PageResponse<PaymentResponse> getMyPayments(Long touristId, Pageable pageable) {
        Page<Payment> page = paymentRepository.findByBooking_Tourist_Id(touristId, pageable);
        // Đóng các giao dịch bị bỏ rơi (xem `closeStrandedOfPaidBookings`).
        closeStrandedOfPaidBookings(page.getContent());
        // Đóng các giao dịch quá hạn thanh toán (xem `closeExpiredPayments`).
        closeExpiredPayments(page.getContent());
        return PageResponse.from(page, PaymentResponse::fromEntity);
    }

    @Transactional
    public PageResponse<PaymentResponse> getByBooking(Long bookingId, Long callerId, boolean isAdmin, Pageable pageable) {
        Booking booking = bookingService.findOrThrow(bookingId);
        if (!isAdmin) {
            checkOwnership(booking, callerId);
        }
        Page<Payment> page = paymentRepository.findByBooking_Id(bookingId, pageable);
        // Đóng các giao dịch kẹt của booking này (xem `closeStrandedOfPaidBookings`).
        closeStrandedOfPaidBookings(page.getContent());
        // Đóng các giao dịch quá hạn thanh toán (xem `closeExpiredPayments`).
        closeExpiredPayments(page.getContent());
        return PageResponse.from(page, PaymentResponse::fromEntity);
    }

    /**
     * Danh sách giao dịch (ADMIN) — có hỗ trợ tìm kiếm toàn hệ thống.
     *
     * @param status  lọc theo trạng thái (null = tất cả)
     * @param search  từ khoá tìm theo mã giao dịch / mã đơn / mã giao dịch VNPay
     *                (null hoặc rỗng = không lọc)
     */
    @Transactional
    public PageResponse<PaymentResponse> getAll(PaymentStatus status, String search, Pageable pageable) {
        String keyword = (search != null && !search.isBlank()) ? search.trim() : null;

        // Tách 2 nhánh: query có tham số null chung (`search IS NULL`) sinh SQL
        // `lower(bytea)` trên PostgreSQL ⇒ 500 cho MỌI request danh sách.
        // Nhánh không tìm kiếm dùng query chuẩn của JpaRepository (không tham số null).
        Page<Payment> page = (keyword == null)
                ? paymentRepository.findByStatusPage(status, pageable)
                : paymentRepository.searchByKeyword(status, keyword, pageable);

        // Đóng các giao dịch bị bỏ rơi (xem `closeStrandedOfPaidBookings`).
        closeStrandedOfPaidBookings(page.getContent());
        // Đóng các giao dịch quá hạn thanh toán (xem `closeExpiredPayments`).
        closeExpiredPayments(page.getContent());

        // Gắn số tiền đã hoàn cho từng dòng (gom 1 câu truy vấn, không N+1).
        Map<Long, BigDecimal> refundedByPayment = loadRefundedByPaymentId(page.getContent());

        return PageResponse.from(page, p -> PaymentResponse.fromEntity(p, refundedByPayment.get(p.getId())));
    }

    /**
     * Gom tổng số tiền đã hoàn theo payment id — 1 câu truy vấn cho cả trang.
     */
    private Map<Long, BigDecimal> loadRefundedByPaymentId(List<Payment> payments) {
        if (payments == null || payments.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = payments.stream().map(Payment::getId).toList();
        Map<Long, BigDecimal> result = new HashMap<>();
        for (Object[] row : refundRepository.sumRefundedAmountByPaymentIds(ids)) {
            Object id = row[0];
            Object amount = row[1];
            if (id instanceof Long paymentId && amount instanceof BigDecimal value) {
                result.put(paymentId, value);
            }
        }
        return result;
    }

    /**
     * Chi tiết GIAO DỊCH + ĐƠN đặt tour — gộp lại cho một modal.
     *
     * <p>Gộp để Admin không phải nhảy qua lại giữa tab "Giao dịch" và "Đơn đặt tour":
     * bấm "Chi tiết" là thấy ngay giao dịch, đơn, dòng tiền và các yêu cầu hoàn tiền
     * liên quan của cùng một đơn.
     *
     * @param paymentId id giao dịch cần xem
     * @param callerId  id người gọi (dùng cho kiểm tra quyền khi không phải admin)
     * @param isAdmin   có phải Admin không (Admin xem được mọi giao dịch)
     */
    @Transactional
    public PaymentDetailResponse getDetail(Long paymentId, Long callerId, boolean isAdmin) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));
        if (!isAdmin) {
            checkOwnership(payment.getBooking(), callerId);
        }

        // Đối soát trước khi trả về: giao dịch treo của đơn đã thanh toán ⇒ đóng lại.
        closeStrandedOfPaidBookings(List.of(payment));
        // Giao dịch đã quá hạn thanh toán mà chưa có kết quả ⇒ chuyển sang EXPIRED.
        closeExpiredPayments(List.of(payment));

        Booking booking = payment.getBooking();
        Long bookingId = booking != null ? booking.getId() : null;

        // Số tiền đã hoàn của giao dịch này.
        BigDecimal refunded = refundRepository.sumRefundedAmountByPayment(paymentId);

        // Các lần thử thanh toán khác của cùng đơn (đối chiếu trùng lặp UC-04).
        List<PaymentResponse> siblings = List.of();
        if (bookingId != null) {
            List<Payment> siblingEntities = paymentRepository.findByBooking_IdOrderByCreatedAtDesc(bookingId);
            Map<Long, BigDecimal> refundedMap = loadRefundedByPaymentId(siblingEntities);
            siblings = siblingEntities.stream()
                    .map(p -> PaymentResponse.fromEntity(p, refundedMap.get(p.getId())))
                    .toList();
        }

        // Các yêu cầu hoàn tiền của giao dịch này.
        List<RefundResponse> refunds = refundRepository
                .findByPayment_IdOrderByCreatedAtDesc(paymentId).stream()
                .map(RefundResponse::fromEntity)
                .toList();

        // Thông tin đơn đặt tour.
        BookingResponse bookingResponse = (bookingId != null)
                ? bookingService.buildResponse(booking, callerId, isAdmin)
                : null;

        BigDecimal amount = payment.getAmount() != null ? payment.getAmount() : BigDecimal.ZERO;
        BigDecimal discount = booking != null && booking.getDiscountAmount() != null
                ? booking.getDiscountAmount()
                : BigDecimal.ZERO;
        BigDecimal refundedAmount = refunded != null ? refunded : BigDecimal.ZERO;

        // ⚠️ Thực thu = 0 nếu giao dịch CHƯA THÀNH CÔNG — không có dòng tiền
        // nào thu được. Xem `PaymentResponse.fromEntity`.
        BigDecimal netAmount = payment.getStatus() == PaymentStatus.SUCCESS
                ? amount.subtract(refundedAmount)
                : BigDecimal.ZERO;

        return PaymentDetailResponse.builder()
                .payment(PaymentResponse.fromEntity(payment, refundedAmount))
                .booking(bookingResponse)
                .siblingPayments(siblings)
                .refunds(refunds)
                .cashFlow(PaymentDetailResponse.CashFlow.builder()
                        .originalAmount(amount.add(discount))
                        .discountAmount(discount)
                        .voucherCode(booking != null ? booking.getAppliedVoucherCode() : null)
                        .voucherScope(booking != null && booking.getVoucherScope() != null
                                ? booking.getVoucherScope().name() : null)
                        .paidAmount(amount)
                        .refundedAmount(refundedAmount)
                        .netAmount(netAmount)
                        .build())
                .build();
    }

    /**
     * Tổng hợp giao dịch thanh toán TOÀN HỆ THỐNG — dùng cho ô chỉ số.
     *
     * <p>Cố tình TÁCH RIÊNG khỏi {@link #getAll} vì số liệu tổng phải độc lập với
     * trang đang xem; cộng trên nội dung trang sẽ cho kết quả sai khi phân trang.
     */
    @Transactional(readOnly = true)
    public PaymentSummaryResponse getSummary() {
        BigDecimal successAmount = paymentRepository.sumAmountByStatus(PaymentStatus.SUCCESS);
        long successCount = paymentRepository.countByStatus(PaymentStatus.SUCCESS);
        long pendingCount = paymentRepository.countByStatusIn(List.of(
                PaymentStatus.PENDING, PaymentStatus.PROCESSING));
        long failedCount = paymentRepository.countByStatusIn(List.of(
                PaymentStatus.FAILED, PaymentStatus.CANCELLED, PaymentStatus.EXPIRED,
                PaymentStatus.SUPERSEDED));
        long totalCount = paymentRepository.count();

        return PaymentSummaryResponse.fromEntity(
                successAmount == null ? BigDecimal.ZERO : successAmount,
                successCount, pendingCount, failedCount, totalCount);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    private void checkOwnership(Booking booking, Long callerId) {
        Long ownerId = booking.getTourist() != null ? booking.getTourist().getId() : null;
        if (ownerId == null || !ownerId.equals(callerId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Bạn không có quyền truy cập giao dịch này");
        }
    }

    private String generateTxnRef(Long bookingId) {
        // vnp_TxnRef tối đa 100 ký tự, alphanumeric — dùng mã ngắn gắn với booking.
        return "JG" + bookingId + "-" + UUID.randomUUID().toString().replace("-", "").substring(0, 20).toUpperCase();
    }

    /**
     * Kiểm tra số tiền trong kết quả thanh toán có khớp với số tiền của đơn hàng không.
     *
     * <p>VNPay gửi {@code vnp_Amount} ĐÃ NHÂN 100 (VD 580.000 VND → {@code 58000000}).
     * Nếu thiếu tham số này ⇒ bỏ qua kiểm tra (một số biến thể callback không kèm).
     *
     * @throws AppException {@link ErrorCode#PAYMENT_AMOUNT_MISMATCH} khi không khớp
     */
    private void verifyAmountMatchesBooking(Payment payment, Map<String, String> params) {
        String rawAmount = params.get("vnp_Amount");
        if (rawAmount == null || rawAmount.isBlank()) {
            return;
        }
        long vnpAmount;
        try {
            vnpAmount = Long.parseLong(rawAmount.trim());
        } catch (NumberFormatException e) {
            throw new AppException(ErrorCode.PAYMENT_AMOUNT_MISMATCH,
                    "Số tiền trong kết quả thanh toán không hợp lệ: " + rawAmount);
        }

        BigDecimal expected = payment.getAmount() != null ? payment.getAmount() : BigDecimal.ZERO;
        long expectedX100 = VnPayProperties.toVnPayAmount(expected);
        if (vnpAmount != expectedX100) {
            log.warn("[Payment][Return] txnRef={} SỐ TIỀN KHÔNG KHỚP: VNPay={} đơn hàng={} (x100).",
                    payment.getTxnRef(), vnpAmount, expectedX100);
            throw new AppException(ErrorCode.PAYMENT_AMOUNT_MISMATCH,
                    "Số tiền thanh toán không khớp với đơn hàng (VNPay: "
                            + expected.toPlainString() + " " + payment.getCurrency() + ")");
        }
    }

    private String buildOrderInfo(Booking booking) {
        String title = booking.getTour() != null ? booking.getTour().getTitle() : "Tour";
        // vnp_OrderInfo tối đa 255 ký tự, nên cắt bớt và bỏ dấu tiếng Việt cho an toàn.
        String info = "Thanh toan don hang " + booking.getBookingCode() + " - " + title;
        // ⚠️ Phải cắt trên CHÍNH chuỗi sẽ trả về. Trước đây kiểm tra
        // `removeDiacritics(info).length() > 250` nhưng trả về `info` (còn dấu) ⇒
        // độ dài thực tế có thể VƯỢT giới hạn 255 của VNPay.
        String normalized = removeDiacritics(info);
        return normalized.length() > 250 ? normalized.substring(0, 250) : normalized;
    }

    private String removeDiacritics(String text) {
        String normalized = java.text.Normalizer.normalize(text, java.text.Normalizer.Form.NFD);
        return normalized.replaceAll("\\p{InCombiningDiacriticalMarks}+", "");
    }

    /**
     * Parse {@code vnp_PayDate} (yyyyMMddHHmmss, GMT+7) thành {@link Instant}.
     */
    private Instant parseVnPayDate(String payDate) {
        if (payDate == null || payDate.isBlank()) {
            return null;
        }
        try {
            LocalDateTime local = LocalDateTime.parse(payDate, java.time.format.DateTimeFormatter.ofPattern("yyyyMMddHHmmss"));
            return local.atZone(VIETNAM_ZONE).toInstant();
        } catch (Exception e) {
            log.warn("[Payment] Không parse được vnp_PayDate='{}': {}", payDate, e.getMessage());
            return null;
        }
    }

    private PaymentVerificationResponse toVerificationResponse(Payment payment, String message) {
        Booking booking = payment.getBooking();
        return PaymentVerificationResponse.builder()
                .paymentId(payment.getId())
                .bookingId(booking != null ? booking.getId() : null)
                .bookingCode(booking != null ? booking.getBookingCode() : null)
                .status(payment.getStatus() != null ? payment.getStatus().name() : null)
                .txnRef(payment.getTxnRef())
                .amount(payment.getAmount())
                .vnpTransactionNo(payment.getVnpTransactionNo())
                .bookingStatus(booking != null && booking.getStatus() != null ? booking.getStatus().name() : null)
                .message(message)
                .build();
    }
}
