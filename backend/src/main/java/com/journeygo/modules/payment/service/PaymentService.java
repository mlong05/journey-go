package com.journeygo.modules.payment.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.booking.repository.BookingRepository;
import com.journeygo.modules.booking.service.BookingService;
import com.journeygo.modules.partnerrevenue.service.PartnerRevenueService;
import com.journeygo.modules.payment.config.VnPayProperties;
import com.journeygo.modules.payment.dto.response.PaymentInitResponse;
import com.journeygo.modules.payment.dto.response.PaymentResponse;
import com.journeygo.modules.payment.dto.response.PaymentVerificationResponse;
import com.journeygo.modules.payment.entity.Payment;
import com.journeygo.modules.payment.entity.enums.PaymentOutcome;
import com.journeygo.modules.payment.entity.enums.PaymentStatus;
import com.journeygo.modules.payment.repository.PaymentRepository;
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

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final BookingService bookingService;
    private final VnPayClient vnPayClient;
    private final VnPayProperties vnPayProperties;
    private final PartnerRevenueService partnerRevenueService;
    private final PaymentMethodService paymentMethodService;

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
        return initiatePayment(bookingId, touristId, clientIp, null);
    }

    /**
     * Khởi tạo thanh toán với phương thức thanh toán do khách chọn (tuỳ chọn).
     *
     * @param bankCode mã {@code vnp_BankCode} khách chọn (VD {@code VNPAYQR}, {@code VNBANK},
     *                 {@code INTCARD}, hoặc mã ngân hàng cụ thể). Null/rỗng → KHÔNG gửi
     *                 {@code vnp_BankCode} → khách chọn phương thức trên trang VNPay.
     */
    @Transactional
    public PaymentInitResponse initiatePayment(Long bookingId, Long touristId, String clientIp, String bankCode) {
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
                    throw new AppException(ErrorCode.PAYMENT_NOT_RETRYABLE,
                            "Chưa xác minh được kết quả giao dịch trước (mã " + attempt.getTxnRef()
                                    + "). Vui lòng kiểm tra lại sau — hệ thống không cho phép tạo giao dịch mới "
                                    + "để tránh thanh toán trùng.");
                }
                // FAILED / CANCELLED rõ ràng → được phép tạo attempt mới.
                break;
            }
        }

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

        String paymentUrl = vnPayClient.buildPaymentUrl(txnRef, amount, orderInfo,
                createDate, expireDate, clientIp, bankCode);

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
                payment.getId(), txnRef, booking.getId(), amount,
                (bankCode != null && !bankCode.isBlank()) ? bankCode : "(khách tự chọn)");

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
     * <p>Return URL KHÔNG phải nguồn xác minh đáng tin cậy (người dùng có thể giả mạo), nên:
     * <ul>
     *   <li>Kiểm tra chữ ký (bắt buộc).</li>
     *   <li>Nếu kết quả chưa rõ → gọi QueryDR để xác minh với VNPay trước khi kết luận.</li>
     *   <li>Trả về trạng thái cuối cùng cho frontend hiển thị.</li>
     * </ul>
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

        // Nếu đã có kết quả rõ ràng → trả về luôn, không cần truy vấn lại.
        if (payment.getStatus().isFinal()) {
            return toVerificationResponse(payment, payment.isSuccess()
                    ? "Thanh toán thành công"
                    : "Thanh toán không thành công: " + (payment.getVnpMessage() != null ? payment.getVnpMessage() : ""));
        }

        // Kết quả chưa rõ → xác minh trực tiếp với VNPay (QueryDR).
        PaymentOutcome outcome = verifyWithVnPay(payment, clientIp);
        if (outcome == PaymentOutcome.UNKNOWN) {
            // KHÔNG kết luận thất bại — giữ trạng thái chờ xác minh.
            payment.markProcessing();
            payment.setNote("Chưa xác minh được kết quả thanh toán — đang chờ QueryDR xác nhận.");
            paymentRepository.save(payment);
            return toVerificationResponse(payment, "Chưa xác minh được kết quả thanh toán. Vui lòng kiểm tra lại sau.");
        }

        return toVerificationResponse(payment, payment.isSuccess()
                ? "Thanh toán thành công"
                : "Thanh toán không thành công: " + (payment.getVnpMessage() != null ? payment.getVnpMessage() : ""));
    }

    // ── QueryDR ───────────────────────────────────────────────────────────────

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
            return payment.isSuccess() ? PaymentOutcome.SUCCESS : PaymentOutcome.FAILED;
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

        // Ghi nhận doanh thu Partner — CHỈ ghi nhận một lần cho giao dịch này.
        recordPartnerRevenue(booking, payment);

        log.info("[Payment] Đã xác nhận booking {} sau khi xác minh thanh toán (txnRef={}, paidAt={}).",
                booking.getId(), payment.getTxnRef(), paidAt);
        return PaymentOutcome.SUCCESS;
    }

    /**
     * Ghi nhận doanh thu Partner cho Booking vừa được xác nhận.
     *
     * <p>Idempotent — bản ghi doanh thu được tạo/cập nhật theo cặp (Booking, Partner), nên
     * callback trùng (UC-04) không tạo ra doanh thu lần thứ hai.
     */
    private void recordPartnerRevenue(Booking booking, Payment payment) {
        try {
            partnerRevenueService.recordRevenueForBooking(booking, payment);
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
            recordPartnerRevenue(booking, payment);
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
        return PaymentOutcome.SUCCESS;
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

    @Transactional(readOnly = true)
    public PaymentResponse getById(Long paymentId, Long callerId, boolean isAdmin) {
        Payment payment = paymentRepository.findById(paymentId)
                .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));
        if (!isAdmin) {
            checkOwnership(payment.getBooking(), callerId);
        }
        return PaymentResponse.fromEntity(payment);
    }

    @Transactional(readOnly = true)
    public PageResponse<PaymentResponse> getMyPayments(Long touristId, Pageable pageable) {
        Page<Payment> page = paymentRepository.findByBooking_Tourist_Id(touristId, pageable);
        return PageResponse.from(page, PaymentResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public PageResponse<PaymentResponse> getByBooking(Long bookingId, Long callerId, boolean isAdmin, Pageable pageable) {
        Booking booking = bookingService.findOrThrow(bookingId);
        if (!isAdmin) {
            checkOwnership(booking, callerId);
        }
        Page<Payment> page = paymentRepository.findByBooking_Id(bookingId, pageable);
        return PageResponse.from(page, PaymentResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public PageResponse<PaymentResponse> getAll(PaymentStatus status, Pageable pageable) {
        Page<Payment> page = paymentRepository.findAll(pageable);
        return PageResponse.from(page, PaymentResponse::fromEntity);
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

    private String buildOrderInfo(Booking booking) {
        String title = booking.getTour() != null ? booking.getTour().getTitle() : "Tour";
        // vnp_OrderInfo tối đa 255 ký tự, nên cắt bớt và bỏ dấu tiếng Việt cho an toàn.
        String info = "Thanh toan don hang " + booking.getBookingCode() + " - " + title;
        return removeDiacritics(info).length() > 250 ? info.substring(0, 250) : info;
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
                .status(payment.getStatus() != null ? payment.getStatus().name() : null)
                .txnRef(payment.getTxnRef())
                .amount(payment.getAmount())
                .vnpTransactionNo(payment.getVnpTransactionNo())
                .bookingStatus(booking != null && booking.getStatus() != null ? booking.getStatus().name() : null)
                .message(message)
                .build();
    }
}
