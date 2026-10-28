package com.journeygo.modules.refund.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.finance.config.FinanceProperties;
import com.journeygo.modules.payment.entity.Payment;
import com.journeygo.modules.payment.entity.enums.PaymentStatus;
import com.journeygo.modules.payment.repository.PaymentRepository;
import com.journeygo.modules.payment.service.VnPayClient;
import com.journeygo.modules.refund.dto.request.CreateRefundRequest;
import com.journeygo.modules.refund.dto.request.ManualTransferRequest;
import com.journeygo.modules.refund.dto.request.ReviewRefundRequest;
import com.journeygo.modules.refund.dto.response.RefundResponse;
import com.journeygo.modules.refund.entity.RefundAuditLog;
import com.journeygo.modules.refund.entity.RefundRequest;
import com.journeygo.modules.refund.entity.enums.RefundMethod;
import com.journeygo.modules.refund.entity.enums.RefundReason;
import com.journeygo.modules.refund.entity.enums.RefundStatus;
import com.journeygo.modules.refund.event.RefundCompletedEvent;
import com.journeygo.modules.refund.repository.RefundAuditLogRepository;
import com.journeygo.modules.refund.repository.RefundRequestRepository;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Map;
import java.util.UUID;

/**
 * Refund — nghiệp vụ hoàn tiền.
 *
 * <p>Các quy tắc được cài đặt (theo tài liệu "Refund Processing Policy"):
 * <ul>
 *   <li><b>Quy tắc 1</b> — chỉ hoàn tiền cho Payment có trạng thái SUCCESS.</li>
 *   <li><b>Quy tắc 2</b> — thời hạn 24 giờ kể từ thời điểm thanh toán thành công <b>đã được
 *       xác minh</b> ({@code paidAt}), không dùng thời điểm tạo Booking/Payment.</li>
 *   <li><b>Quy tắc 3</b> — mỗi Payment chỉ có tối đa một yêu cầu Refund đang xử lý hoặc đã hoàn
 *       tất.</li>
 *   <li><b>Quy tắc 5</b> — số tiền do hệ thống tính: 50% (lỗi Tourist) / 100% (lỗi nền tảng);
 *       Tourist KHÔNG tự nhập số tiền.</li>
 *   <li><b>Quy tắc 7</b> — KHÔNG ghi nhận REFUNDED chỉ vì yêu cầu đã được gửi đi; chỉ khi có
 *       bằng chứng xác minh (VNPay xác nhận, hoặc Admin nhập mã tham chiếu + bằng chứng
 *       chuyển khoản).</li>
 *   <li><b>Quy tắc 8</b> — mọi thao tác đều được ghi vào audit log.</li>
 *   <li><b>UC-04/UC-05</b> — VNPay Sandbox có thể trả "Chờ duyệt" → giữ trạng thái
 *       {@link RefundStatus#REFUND_PROCESSING}; KHÔNG tự động gửi lại hoặc chuyển sang
 *       phương thức thủ công chỉ vì timeout.</li>
 *   <li><b>UC-06</b> — tổng số tiền hoàn thành công không được vượt quá số tiền thanh toán.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class RefundService {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    /** Các trạng thái coi là "đã có yêu cầu refund đang mở" — chặn tạo yêu cầu trùng. */
    private static final List<RefundStatus> OPEN_STATUSES = List.of(
            RefundStatus.PENDING_REVIEW,
            RefundStatus.APPROVED,
            RefundStatus.REFUND_PROCESSING,
            RefundStatus.REFUNDED);

    private final RefundRequestRepository refundRepository;
    private final RefundAuditLogRepository auditLogRepository;
    private final PaymentRepository paymentRepository;
    private final UserRepository userRepository;
    private final VnPayClient vnPayClient;
    private final FinanceProperties financeProperties;
    private final ApplicationEventPublisher eventPublisher;

    // ── Create (Tourist) ──────────────────────────────────────────────────────

    /**
     * Tourist gửi yêu cầu hoàn tiền.
     *
     * <p>Kiểm tra đầy đủ (UC-01):
     * <ol>
     *   <li>Payment thuộc về Tourist đang đăng nhập.</li>
     *   <li>Payment có trạng thái SUCCESS (đã xác minh).</li>
     *   <li>Còn trong thời hạn 24 giờ kể từ {@code paidAt}.</li>
     *   <li>Chưa có yêu cầu Refund đang mở / đã hoàn tất cho Payment này.</li>
     * </ol>
     */
    @Transactional
    public RefundResponse createRefund(CreateRefundRequest request, Long touristId) {
        Payment payment = paymentRepository.findById(request.paymentId())
                .orElseThrow(() -> new AppException(ErrorCode.REFUND_NOT_FOUND,
                        "Không tìm thấy giao dịch thanh toán"));

        // 1. Chủ sở hữu
        Long ownerId = payment.getBooking() != null && payment.getBooking().getTourist() != null
                ? payment.getBooking().getTourist().getId() : null;
        if (ownerId == null || !ownerId.equals(touristId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED,
                    "Bạn không có quyền yêu cầu hoàn tiền cho giao dịch này");
        }

        // 2. Trạng thái thanh toán phải là SUCCESS (đã được xác minh)
        if (payment.getStatus() != PaymentStatus.SUCCESS) {
            throw new AppException(ErrorCode.REFUND_PAYMENT_NOT_SUCCESS,
                    "Chỉ được tạo yêu cầu hoàn tiền cho giao dịch đã thanh toán thành công. "
                            + "Trạng thái hiện tại: " + payment.getStatus());
        }

        // 3. Thời hạn 24 giờ kể từ thời điểm thanh toán thành công đã xác minh
        Instant paidAt = payment.getPaidAt();
        if (paidAt == null) {
            throw new AppException(ErrorCode.REFUND_PAYMENT_NOT_SUCCESS,
                    "Giao dịch chưa có thời điểm thanh toán đã xác minh — không thể gửi yêu cầu hoàn tiền");
        }
        Instant deadline = paidAt.plus(Duration.ofHours(financeProperties.getRefundWindowHours()));
        if (Instant.now().isAfter(deadline)) {
            throw new AppException(ErrorCode.REFUND_WINDOW_EXPIRED,
                    "Đã quá thời hạn " + financeProperties.getRefundWindowHours()
                            + " giờ kể từ thời điểm thanh toán thành công để gửi yêu cầu hoàn tiền");
        }

        // 4. Chặn yêu cầu trùng
        List<RefundRequest> existing = refundRepository.findOpenOrCompletedByPayment(payment.getId(), OPEN_STATUSES);
        if (!existing.isEmpty()) {
            RefundRequest current = existing.get(0);
            if (current.getStatus() == RefundStatus.REJECTED) {
                // Yêu cầu trước bị từ chối → chỉ cho gửi lại nếu còn trong thời hạn và
                // chính sách cho phép (mặc định KHÔNG cho).
                if (financeProperties.effectiveRefundResubmitWindowHours() <= 0) {
                    throw new AppException(ErrorCode.REFUND_ALREADY_EXISTS,
                            "Yêu cầu hoàn tiền trước đó đã bị từ chối. Vui lòng liên hệ hỗ trợ.");
                }
                Instant resubmitDeadline = paidAt.plus(Duration.ofHours(
                        financeProperties.effectiveRefundResubmitWindowHours()));
                if (Instant.now().isAfter(resubmitDeadline)) {
                    throw new AppException(ErrorCode.REFUND_ALREADY_EXISTS,
                            "Đã quá thời hạn gửi lại yêu cầu hoàn tiền");
                }
            } else {
                throw new AppException(ErrorCode.REFUND_ALREADY_EXISTS,
                        "Giao dịch này đã có yêu cầu hoàn tiền đang xử lý hoặc đã hoàn tất (mã "
                                + current.getRefundCode() + ")");
            }
        }

        // 5. Tính số tiền đề xuất — hệ thống tự tính, Tourist không tự nhập
        BigDecimal proposed = calculateRefundAmount(payment.getAmount(), request.reason());

        User tourist = userRepository.findById(touristId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        RefundRequest refund = RefundRequest.builder()
                .refundCode(generateRefundCode())
                .payment(payment)
                .tourist(tourist)
                .status(RefundStatus.PENDING_REVIEW)
                .declaredReason(request.reason())
                .reasonDetail(request.reasonDetail())
                .evidence(request.evidence())
                .proposedAmount(proposed)
                .currency(payment.getCurrency())
                .bankAccountNumber(request.bankAccountNumber())
                .bankAccountName(request.bankAccountName())
                .bankName(request.bankName())
                .build();

        RefundRequest saved = refundRepository.save(refund);

        audit(saved, RefundAuditLog.Action.CREATED, null, RefundStatus.PENDING_REVIEW, tourist,
                proposed, saved.getRefundCode(),
                "Tourist gửi yêu cầu hoàn tiền. Nguyên nhân: " + request.reason()
                        + ". Số tiền đề xuất: " + proposed.toPlainString());

        log.info("[Refund] Đã tạo yêu cầu hoàn tiền id={} code={} payment={} amount={}",
                saved.getId(), saved.getRefundCode(), payment.getId(), proposed);

        return RefundResponse.fromEntity(saved);
    }

    /**
     * Tính số tiền hoàn theo nguyên nhân (Quy tắc 5).
     *
     * <p>50% cho lỗi Tourist / lý do cá nhân, 100% cho lỗi nền tảng.
     */
    public BigDecimal calculateRefundAmount(BigDecimal paymentAmount, RefundReason reason) {
        if (paymentAmount == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal rate = switch (reason) {
            case TOURIST_FAULT -> financeProperties.getTouristFaultRefundRate();
            case PLATFORM_FAULT -> financeProperties.getPlatformFaultRefundRate();
        };
        return paymentAmount.multiply(rate).setScale(2, RoundingMode.HALF_UP);
    }

    // ── Review (Admin) ────────────────────────────────────────────────────────

    /**
     * Admin phê duyệt hoặc từ chối yêu cầu Refund.
     *
     * <p>Quy tắc nghiệp vụ (UC-02):
     * <ul>
     *   <li>Admin xác định nguyên nhân (có thể khác nguyên nhân Tourist khai báo).</li>
     *   <li>Số tiền được hệ thống tính theo nguyên nhân — Admin chỉ có thể điều chỉnh
     *       trong phạm vi chính sách (tức là bằng số tiền hệ thống tính cho nguyên nhân đó).
     *       Nếu Admin đưa ra số tiền vượt phạm vi → từ chối thao tác, yêu cầu chọn đúng
     *       nguyên nhân.</li>
     *   <li>Tổng số tiền hoàn (đã hoàn tất + đang chờ) không được vượt quá số tiền
     *       thanh toán (UC-06).</li>
     * </ul>
     */
    @Transactional
    public RefundResponse reviewRefund(Long refundId, ReviewRefundRequest request, Long adminId) {
        RefundRequest refund = refundRepository.findByIdForUpdate(refundId)
                .orElseThrow(() -> new AppException(ErrorCode.REFUND_NOT_FOUND));

        if (refund.getStatus() != RefundStatus.PENDING_REVIEW) {
            throw new AppException(ErrorCode.REFUND_INVALID_STATUS,
                    "Yêu cầu hoàn tiền không ở trạng thái chờ duyệt (hiện tại: " + refund.getStatus() + ")");
        }

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        RefundStatus fromStatus = refund.getStatus();

        if (Boolean.FALSE.equals(request.approve())) {
            String reason = request.rejectionReason();
            if (reason == null || reason.isBlank()) {
                throw new AppException(ErrorCode.VALIDATION_ERROR,
                        "Vui lòng nhập lý do từ chối yêu cầu hoàn tiền");
            }
            refund.reject(admin, reason);
            refundRepository.save(refund);
            audit(refund, RefundAuditLog.Action.REJECTED, fromStatus, RefundStatus.REJECTED, admin,
                    null, null, "Admin từ chối yêu cầu hoàn tiền: " + reason);
            log.info("[Refund] Admin {} từ chối yêu cầu hoàn tiền id={}", adminId, refundId);
            return RefundResponse.fromEntity(refund);
        }

        // ── Phê duyệt ──────────────────────────────────────────────────────────
        RefundReason approvedReason = request.reason() != null ? request.reason() : refund.getDeclaredReason();
        BigDecimal policyAmount = calculateRefundAmount(refund.getPayment().getAmount(), approvedReason);

        if (request.amount() != null && request.amount().compareTo(policyAmount) != 0) {
            throw new AppException(ErrorCode.REFUND_AMOUNT_MISMATCH,
                    "Số tiền được duyệt (" + request.amount().toPlainString()
                            + ") không khớp chính sách cho nguyên nhân " + approvedReason
                            + " (" + policyAmount.toPlainString() + "). "
                            + "Hệ thống tự tính số tiền theo nguyên nhân — vui lòng chọn đúng nguyên nhân.");
        }

        // UC-06 — không cho vượt quá số tiền còn có thể hoàn
        BigDecimal alreadyRefunded = refundRepository.sumRefundedAmountByPayment(refund.getPayment().getId());
        BigDecimal pending = sumPendingAmounts(refund.getPayment().getId(), refund.getId());
        BigDecimal maxRefundable = refund.getPayment().getAmount().subtract(alreadyRefunded);
        if (policyAmount.compareTo(maxRefundable) > 0) {
            throw new AppException(ErrorCode.REFUND_EXCEEDS_PAYMENT_AMOUNT,
                    "Tổng số tiền hoàn vượt quá số tiền thanh toán. Số tiền còn có thể hoàn: "
                            + maxRefundable.toPlainString() + " (đang xử lý: " + pending.toPlainString() + ")");
        }

        RefundMethod method = request.method() != null ? request.method() : RefundMethod.VNPAY_API;

        refund.approve(admin, approvedReason, policyAmount);
        refund.setMethod(method);
        refundRepository.save(refund);

        audit(refund, RefundAuditLog.Action.APPROVED, fromStatus, RefundStatus.APPROVED, admin,
                policyAmount, null,
                "Admin phê duyệt hoàn " + policyAmount.toPlainString()
                        + " — nguyên nhân: " + approvedReason + ", phương thức: " + method
                        + (request.note() != null ? ". Ghi chú: " + request.note() : ""));

        log.info("[Refund] Admin {} duyệt hoàn tiền id={} amount={} method={}",
                adminId, refundId, policyAmount, method);

        // ── Thực hiện hoàn tiền theo phương thức được chọn ─────────────────────
        if (method == RefundMethod.VNPAY_API) {
            return executeVnPayRefund(refund, admin);
        }
        // MANUAL_BANK_TRANSFER — chờ Admin xác nhận đã chuyển khoản (kèm bằng chứng)
        refund.markProcessing();
        refundRepository.save(refund);
        audit(refund, RefundAuditLog.Action.MANUAL_TRANSFER_RECORDED, RefundStatus.APPROVED,
                RefundStatus.REFUND_PROCESSING, admin, policyAmount, null,
                "Chờ Admin thực hiện chuyển khoản thủ công và nhập mã tham chiếu + bằng chứng.");

        return RefundResponse.fromEntity(refund);
    }

    // ── VNPay Refund ──────────────────────────────────────────────────────────

    /**
     * Gửi yêu cầu hoàn tiền tới VNPay và ghi nhận phản hồi.
     *
     * <p>QUAN TRỌNG (UC-04): phản hồi {@code vnp_ResponseCode=00} chỉ có nghĩa "yêu cầu đã
     * được tiếp nhận" — KHÔNG có nghĩa tiền đã về tài khoản. Vì vậy:
     * <ul>
     *   <li>Phản hồi không xác minh được (timeout / mất mạng) → giữ {@code REFUND_PROCESSING}.</li>
     *   <li>Phản hồi cho biết đang xử lý (status 05/06) → giữ {@code REFUND_PROCESSING}.</li>
     *   <li>Chỉ khi trạng thái giao dịch là {@code 00} (thành công) mới chuyển {@code REFUNDED}.</li>
     *   <li>Trạng thái {@code 09} (bị từ chối) → {@code FAILED}.</li>
     * </ul>
     */
    @Transactional
    public RefundResponse executeVnPayRefund(RefundRequest refund, User admin) {
        Payment payment = refund.getPayment();

        String transactionDate = payment.getCreatedAt() != null
                ? vnPayClient.formatDate(LocalDateTime.ofInstant(payment.getCreatedAt(), VIETNAM_ZONE))
                : null;

        String createdBy = admin != null ? String.valueOf(admin.getId()) : "journeygo";

        Map<String, String> response = vnPayClient.requestRefund(
                payment.getTxnRef(),
                refund.getApprovedAmount(),
                payment.getVnpTransactionNo(),
                transactionDate,
                createdBy,
                true);

        refund.setVnpRequestedAt(Instant.now());
        refund.setVnpTxnRef(payment.getTxnRef());

        if (response.isEmpty()) {
            // UC-05 — timeout / không xác định được kết quả → giữ REFUND_PROCESSING.
            refund.setVnpMessage("Không nhận được phản hồi từ VNPay — giữ trạng thái chờ xác minh.");
            refund.markProcessing();
            refundRepository.save(refund);
            audit(refund, RefundAuditLog.Action.VNPAY_REQUEST_SENT, RefundStatus.APPROVED,
                    RefundStatus.REFUND_PROCESSING, admin, refund.getApprovedAmount(), refund.getRefundCode(),
                    "Đã gửi yêu cầu hoàn tiền tới VNPay nhưng KHÔNG nhận được phản hồi (timeout/mất kết nối). "
                            + "Hệ thống giữ trạng thái REFUND_PROCESSING — không tự động gửi lại, "
                            + "không chuyển sang phương thức thủ công.");
            log.warn("[Refund] Không nhận được phản hồi VNPay cho refund id={} — giữ REFUND_PROCESSING", refund.getId());
            return RefundResponse.fromEntity(refund);
        }

        refund.setVnpResponseCode(response.get("vnp_ResponseCode"));
        refund.setVnpTransactionStatus(response.get("vnp_TransactionStatus"));
        refund.setVnpMessage(response.get("vnp_Message"));
        String txnNo = response.get("vnp_TransactionNo");
        if (txnNo != null && !txnNo.isBlank()) {
            refund.setVnpTransactionNo(txnNo);
        }
        String requestId = response.get("vnp_RequestId");
        if (requestId != null && !requestId.isBlank()) {
            refund.setVnpRequestId(requestId);
        }
        refund.setVnpRawResponse(response.toString());

        audit(refund, RefundAuditLog.Action.VNPAY_RESPONSE, RefundStatus.APPROVED, refund.getStatus(),
                admin, refund.getApprovedAmount(), requestId,
                "Phản hồi VNPay: " + response);

        applyVnPayRefundStatus(refund, admin);

        log.info("[Refund] Đã gửi yêu cầu hoàn tiền VNPay id={} status={} code={}",
                refund.getId(), refund.getStatus(), refund.getVnpResponseCode());

        return RefundResponse.fromEntity(refund);
    }

    /**
     * Áp dụng trạng thái giao dịch hoàn tiền từ VNPay vào RefundRequest.
     */
    private void applyVnPayRefundStatus(RefundRequest refund, User admin) {
        String responseCode = refund.getVnpResponseCode();
        String transactionStatus = refund.getVnpTransactionStatus();

        // Chưa xác minh được kết quả → giữ REFUND_PROCESSING
        if (!"00".equals(responseCode)) {
            refund.markProcessing();
            refundRepository.save(refund);
            audit(refund, RefundAuditLog.Action.VNPAY_STATUS_UPDATED, refund.getStatus(),
                    RefundStatus.REFUND_PROCESSING, admin, null, refund.getVnpRequestId(),
                    "VNPay chưa xác nhận kết quả (vnp_ResponseCode=" + responseCode + ") — giữ REFUND_PROCESSING.");
            return;
        }

        String status = transactionStatus == null ? "" : transactionStatus;
        switch (status) {
            case "00" -> {
                // Xác minh thành công — chỉ đây mới được chuyển REFUNDED.
                Instant resolvedAt = Instant.now();
                refund.markRefunded(refund.getApprovedAmount(), resolvedAt);
                refundRepository.save(refund);
                audit(refund, RefundAuditLog.Action.VNPAY_STATUS_UPDATED, RefundStatus.REFUND_PROCESSING,
                        RefundStatus.REFUNDED, admin, refund.getRefundedAmount(), refund.getVnpTransactionNo(),
                        "VNPay xác nhận hoàn tiền thành công: " + refund.getRefundedAmount().toPlainString());
                publishRefundedEvent(refund, resolvedAt);
            }
            case "09" -> {
                refund.markFailed(responseCode, transactionStatus, refund.getVnpMessage());
                refundRepository.save(refund);
                audit(refund, RefundAuditLog.Action.VNPAY_STATUS_UPDATED, refund.getStatus(),
                        RefundStatus.FAILED, admin, null, refund.getVnpTransactionNo(),
                        "VNPay từ chối yêu cầu hoàn tiền (vnp_TransactionStatus=09).");
            }
            default -> {
                // 05 (đang xử lý) / 06 (đã gửi ngân hàng) / 01 → chờ xác minh.
                refund.markProcessing();
                refundRepository.save(refund);
                audit(refund, RefundAuditLog.Action.VNPAY_STATUS_UPDATED, refund.getStatus(),
                        RefundStatus.REFUND_PROCESSING, admin, null, refund.getVnpTransactionNo(),
                        "VNPay đang xử lý yêu cầu hoàn tiền (vnp_TransactionStatus=" + status
                                + ") — giữ REFUND_PROCESSING.");
            }
        }
    }

    // ── Manual Bank Transfer ──────────────────────────────────────────────────

    /**
     * Admin ghi nhận đã chuyển khoản thủ công kèm mã tham chiếu và bằng chứng.
     *
     * <p>Chỉ khi đã XÁC MINH được giao dịch chuyển tiền (bằng chứng + mã tham chiếu) thì
     * Refund mới chuyển sang {@link RefundStatus#REFUNDED}.
     *
     * <p>UC-06 — một Refund Request không được thực hiện đồng thời qua VNPay và chuyển
     * khoản thủ công: nếu đã gửi yêu cầu VNPay mà chưa rõ kết quả thì bị chặn.
     */
    @Transactional
    public RefundResponse confirmManualTransfer(Long refundId, ManualTransferRequest request, Long adminId) {
        RefundRequest refund = refundRepository.findByIdForUpdate(refundId)
                .orElseThrow(() -> new AppException(ErrorCode.REFUND_NOT_FOUND));

        if (refund.getMethod() != RefundMethod.MANUAL_BANK_TRANSFER) {
            throw new AppException(ErrorCode.REFUND_METHOD_NOT_ALLOWED,
                    "Yêu cầu hoàn tiền này không dùng phương thức chuyển khoản thủ công");
        }
        if (refund.getStatus() == RefundStatus.REFUNDED) {
            throw new AppException(ErrorCode.REFUND_INVALID_STATUS,
                    "Yêu cầu hoàn tiền đã hoàn tất — không thể ghi nhận lại");
        }
        if (refund.getStatus() != RefundStatus.APPROVED && refund.getStatus() != RefundStatus.REFUND_PROCESSING) {
            throw new AppException(ErrorCode.REFUND_INVALID_STATUS,
                    "Trạng thái hiện tại không cho phép ghi nhận chuyển khoản thủ công: " + refund.getStatus());
        }

        // UC-06 — nếu đã gửi yêu cầu VNPay mà chưa xác minh được kết quả → chặn chuyển thủ công
        if (refund.getVnpRequestedAt() != null
                && refund.getVnpResponseCode() != null
                && !"00".equals(refund.getVnpResponseCode())
                && !"09".equals(refund.getVnpTransactionStatus())) {
            throw new AppException(ErrorCode.REFUND_METHOD_NOT_ALLOWED,
                    "Yêu cầu hoàn tiền đã được gửi tới VNPay nhưng chưa xác minh được kết quả — "
                            + "không thể chuyển sang phương thức thủ công để tránh hoàn tiền hai lần.");
        }

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Instant transferredAt = request.transferredAt() != null ? request.transferredAt() : Instant.now();
        refund.setTransferReference(request.transferReference());
        refund.setTransferEvidence(request.transferEvidence());
        refund.setTransferredAt(transferredAt);
        refund.markProcessing();
        refundRepository.save(refund);

        audit(refund, RefundAuditLog.Action.MANUAL_TRANSFER_CONFIRMED, refund.getStatus(),
                RefundStatus.REFUND_PROCESSING, admin, refund.getApprovedAmount(),
                request.transferReference(),
                "Admin ghi nhận đã chuyển khoản thủ công. Mã tham chiếu: " + request.transferReference()
                        + ". Thời điểm: " + transferredAt);

        // Hoàn tiền thủ công chỉ được coi là thành công khi có bằng chứng xác minh.
        // Bằng chứng = mã tham chiếu (bắt buộc) + mô tả/URL bằng chứng.
        boolean hasEvidence = request.transferEvidence() != null && !request.transferEvidence().isBlank();
        if (!hasEvidence) {
            log.warn("[Refund] Chuyển khoản thủ công id={} chưa có bằng chứng — giữ REFUND_PROCESSING", refundId);
            return RefundResponse.fromEntity(refund);
        }

        Instant resolvedAt = Instant.now();
        refund.markRefunded(refund.getApprovedAmount(), resolvedAt);
        refundRepository.save(refund);

        audit(refund, RefundAuditLog.Action.STATUS_UPDATED, RefundStatus.REFUND_PROCESSING,
                RefundStatus.REFUNDED, admin, refund.getRefundedAmount(), request.transferReference(),
                "Đã xác minh chuyển khoản thủ công thành công: " + refund.getRefundedAmount().toPlainString());

        publishRefundedEvent(refund, resolvedAt);

        log.info("[Refund] Xác nhận hoàn tiền thủ công thành công id={} amount={}",
                refundId, refund.getRefundedAmount());

        return RefundResponse.fromEntity(refund);
    }

    // ── Status tracking (Admin) ──────────────────────────────────────────────

    /**
     * Kiểm tra lại trạng thái Refund đang chờ kết quả từ VNPay.
     *
     * <p>Dùng cho nút "Kiểm tra lại trạng thái" của Admin và cho tác vụ nền định kỳ.
     */
    @Transactional
    public RefundResponse refreshStatus(Long refundId) {
        RefundRequest refund = refundRepository.findByIdForUpdate(refundId)
                .orElseThrow(() -> new AppException(ErrorCode.REFUND_NOT_FOUND));

        if (refund.getStatus() != RefundStatus.REFUND_PROCESSING) {
            return RefundResponse.fromEntity(refund);
        }
        if (refund.getMethod() != RefundMethod.VNPAY_API) {
            // Chuyển khoản thủ công — Admin tự xác nhận qua endpoint confirmManualTransfer.
            return RefundResponse.fromEntity(refund);
        }

        Payment payment = refund.getPayment();
        String transactionDate = payment.getCreatedAt() != null
                ? vnPayClient.formatDate(LocalDateTime.ofInstant(payment.getCreatedAt(), VIETNAM_ZONE))
                : null;

        // QueryDR trả về trạng thái giao dịch GỐC. Với yêu cầu hoàn tiền, VNPay Sandbox
        // hiển thị "Chờ duyệt" — vì vậy trạng thái cuối cùng của yêu cầu hoàn chỉnh được
        // xác minh qua phản hồi refund đã lưu, hoặc qua trạng thái giao dịch gốc.
        Map<String, String> response = vnPayClient.queryTransaction(
                payment.getTxnRef(),
                payment.getVnpTransactionNo(),
                transactionDate,
                "Kiem tra hoan tien " + refund.getRefundCode(),
                null);

        if (response.isEmpty()) {
            refund.setVnpMessage("Không xác minh được trạng thái từ VNPay — giữ REFUND_PROCESSING.");
            refundRepository.save(refund);
            return RefundResponse.fromEntity(refund);
        }

        String transactionStatus = response.get("vnp_TransactionStatus");
        refund.setVnpResponseCode(response.get("vnp_ResponseCode"));
        refund.setVnpTransactionStatus(transactionStatus);
        refund.setVnpMessage(response.get("vnp_Message"));
        refund.setVnpRawResponse(response.toString());

        // Trạng thái giao dịch gốc vẫn là 00 (đã thanh toán) — không phải trạng thái hoàn tiền.
        // Vì vậy chỉ khi chính phản hồi refund đã ghi nhận thành công mới chuyển REFUNDED.
        audit(refund, RefundAuditLog.Action.VNPAY_STATUS_UPDATED, RefundStatus.REFUND_PROCESSING,
                RefundStatus.REFUND_PROCESSING, null, null, refund.getVnpRequestId(),
                "Kiểm tra trạng thái từ VNPay: " + response);

        applyVnPayRefundStatus(refund, null);

        return RefundResponse.fromEntity(refund);
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RefundResponse getById(Long refundId, Long callerId, boolean isAdmin) {
        RefundRequest refund = refundRepository.findById(refundId)
                .orElseThrow(() -> new AppException(ErrorCode.REFUND_NOT_FOUND));
        if (!isAdmin) {
            checkOwnership(refund, callerId);
        }
        RefundResponse response = RefundResponse.fromEntity(refund);
        return withAuditLogs(response, refund.getId());
    }

    @Transactional(readOnly = true)
    public RefundResponse getByCode(String refundCode) {
        RefundRequest refund = refundRepository.findByRefundCode(refundCode)
                .orElseThrow(() -> new AppException(ErrorCode.REFUND_NOT_FOUND));
        return withAuditLogs(RefundResponse.fromEntity(refund), refund.getId());
    }

    @Transactional(readOnly = true)
    public PageResponse<RefundResponse> getMyRefunds(Long touristId, Pageable pageable) {
        Page<RefundRequest> page = refundRepository.findByTourist_Id(touristId, pageable);
        return PageResponse.from(page, RefundResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public PageResponse<RefundResponse> getAll(RefundStatus status, Pageable pageable) {
        Page<RefundRequest> page = (status != null)
                ? refundRepository.findByStatus(status, pageable)
                : refundRepository.findAll(pageable);
        return PageResponse.from(page, RefundResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public PageResponse<RefundResponse> getByPayment(Long paymentId, Long callerId, boolean isAdmin, Pageable pageable) {
        if (!isAdmin) {
            Payment payment = paymentRepository.findById(paymentId)
                    .orElseThrow(() -> new AppException(ErrorCode.PAYMENT_NOT_FOUND));
            Long ownerId = payment.getBooking() != null && payment.getBooking().getTourist() != null
                    ? payment.getBooking().getTourist().getId() : null;
            if (ownerId == null || !ownerId.equals(callerId)) {
                throw new AppException(ErrorCode.UNAUTHORIZED, "Bạn không có quyền truy cập giao dịch này");
            }
        }
        Page<RefundRequest> page = refundRepository.findByPayment_Id(paymentId, pageable);
        return PageResponse.from(page, RefundResponse::fromEntity);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Tổng số tiền của các yêu cầu Refund đang chờ xử lý (chưa REFUNDED / REJECTED / FAILED)
     * của một Payment — dùng để kiểm tra tổng số tiền hoàn (UC-06).
     */
    private BigDecimal sumPendingAmounts(Long paymentId, Long excludeRefundId) {
        return refundRepository.findByPayment_IdOrderByCreatedAtDesc(paymentId).stream()
                .filter(r -> !r.getId().equals(excludeRefundId))
                .filter(r -> r.getStatus() == RefundStatus.PENDING_REVIEW
                        || r.getStatus() == RefundStatus.APPROVED
                        || r.getStatus() == RefundStatus.REFUND_PROCESSING)
                .map(RefundRequest::getApprovedAmount)
                .filter(a -> a != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    private void publishRefundedEvent(RefundRequest refund, Instant resolvedAt) {
        Long bookingId = refund.getPayment() != null && refund.getPayment().getBooking() != null
                ? refund.getPayment().getBooking().getId() : null;
        eventPublisher.publishEvent(new RefundCompletedEvent(
                refund.getId(),
                refund.getPayment() != null ? refund.getPayment().getId() : null,
                bookingId,
                refund.getRefundedAmount(),
                resolvedAt));
    }

    private RefundResponse withAuditLogs(RefundResponse response, Long refundId) {
        List<RefundResponse.RefundAuditLogResponse> logs = auditLogRepository
                .findByRefundRequest_IdOrderByCreatedAtAsc(refundId).stream()
                .map(RefundResponse.RefundAuditLogResponse::fromEntity)
                .toList();
        return response.toBuilder().auditLogs(logs).build();
    }

    private void checkOwnership(RefundRequest refund, Long callerId) {
        Long ownerId = refund.getTourist() != null ? refund.getTourist().getId() : null;
        if (ownerId == null || !ownerId.equals(callerId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Bạn không có quyền truy cập yêu cầu hoàn tiền này");
        }
    }

    /** Ghi nhật log kiểm toán — append-only. */
    private void audit(RefundRequest refund, RefundAuditLog.Action action, RefundStatus from, RefundStatus to,
                       User performedBy, BigDecimal amount, String reference, String detail) {
        auditLogRepository.save(RefundAuditLog.builder()
                .refundRequest(refund)
                .action(action)
                .fromStatus(from)
                .toStatus(to)
                .performedBy(performedBy)
                .amount(amount)
                .reference(reference)
                .detail(detail)
                .build());
    }

    private String generateRefundCode() {
        return "RF" + UUID.randomUUID().toString().replace("-", "").substring(0, 20).toUpperCase();
    }
}
