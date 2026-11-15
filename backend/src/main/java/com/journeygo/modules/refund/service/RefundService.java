package com.journeygo.modules.refund.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.booking.repository.BookingPassengerRepository;
import com.journeygo.modules.booking.repository.BookingRepository;
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
import com.journeygo.modules.refund.entity.RefundReasonCode;
import com.journeygo.modules.refund.entity.RefundRequest;
import com.journeygo.modules.refund.entity.enums.RefundMethod;
import com.journeygo.modules.refund.entity.enums.RefundReason;
import com.journeygo.modules.refund.entity.enums.RefundStatus;
import com.journeygo.modules.refund.event.RefundCompletedEvent;
import com.journeygo.modules.refund.repository.RefundAuditLogRepository;
import com.journeygo.modules.refund.repository.RefundRequestRepository;
import com.journeygo.modules.notification.entity.enums.NotificationType;
import com.journeygo.modules.notification.service.NotificationPublisher;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.NumberFormat;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
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
 *       {@link RefundStatus#VNPAY_PROCESSING}; KHÔNG tự động gửi lại hoặc chuyển sang
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
            RefundStatus.VNPAY_PROCESSING,
            RefundStatus.MANUAL_TRANSFER_PENDING,
            RefundStatus.REFUND_PROCESSING,
            RefundStatus.REFUNDED);

    private final RefundRequestRepository refundRepository;
    private final RefundAuditLogRepository auditLogRepository;
    private final PaymentRepository paymentRepository;
    private final BookingRepository bookingRepository;
    private final BookingPassengerRepository passengerRepository;
    private final UserRepository userRepository;
    private final VnPayClient vnPayClient;
    private final FinanceProperties financeProperties;
    private final ApplicationEventPublisher eventPublisher;
    private final NotificationPublisher notifications;
    private final RefundReasonConfigService reasonConfig;
    private final ObjectMapper objectMapper;

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

        // 3. Tour chưa bắt đầu và chưa hoàn thành trải nghiệm
        Booking booking = payment.getBooking();
        if (booking == null || booking.getExperienceDate() == null) {
            throw new AppException(ErrorCode.REFUND_NOT_FOUND,
                    "Không tìm thấy thông tin lịch trình của đơn hàng");
        }
        LocalDate experienceDate = booking.getExperienceDate();
        LocalDate today = LocalDate.now(VIETNAM_ZONE);
        if (!experienceDate.isAfter(today)) {
            throw new AppException(ErrorCode.REFUND_TOUR_ALREADY_STARTED,
                    "Ngày trải nghiệm là " + experienceDate
                            + " — yêu cầu hoàn tiền chỉ được gửi trước ngày khởi hành.");
        }
        if (booking.getStatus() == BookingStatus.COMPLETED) {
            throw new AppException(ErrorCode.REFUND_TOUR_ALREADY_STARTED,
                    "Tour đã hoàn thành trải nghiệm — không thể gửi yêu cầu hoàn tiền.");
        }

        // 3b. Thời điểm thanh toán đã được xác minh — bắt buộc để tính tỷ lệ no-show
        Instant paidAt = payment.getPaidAt();
        if (paidAt == null) {
            throw new AppException(ErrorCode.REFUND_PAYMENT_NOT_SUCCESS,
                    "Giao dịch chưa có thời điểm thanh toán đã xác minh — không thể gửi yêu cầu hoàn tiền");
        }

        // 4. Chặn yêu cầu trùng
        List<RefundRequest> existing = refundRepository.findOpenOrCompletedByPayment(payment.getId(), OPEN_STATUSES);
        if (!existing.isEmpty()) {
            RefundRequest current = existing.get(0);
            if (current.getStatus() == RefundStatus.REJECTED) {
                // Yêu cầu trước bị từ chối → chỉ cho gửi lại nếu còn trong thời hạn và
                // chính sách cho phép (mặc định KHÔNG cho).
                if (financeProperties.effectiveRefundResubmitHoursBeforeStart() <= 0) {
                    throw new AppException(ErrorCode.REFUND_ALREADY_EXISTS,
                            "Yêu cầu hoàn tiền trước đó đã bị từ chối. Vui lòng liên hệ hỗ trợ.");
                }
                Instant resubmitDeadline = experienceDate.atStartOfDay(VIETNAM_ZONE)
                        .minusHours(financeProperties.effectiveRefundResubmitHoursBeforeStart())
                        .toInstant();
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

        // 5. Nhóm lý do + mã lý do chi tiết — KHÔNG BẮT BUỘC.
        //
        //    Form hoàn tiền trên mobile đã được đơn giản hoá: khách chỉ mô tả bằng
        //    văn bản (lý do ngắn gọn + mô tả chi tiết), KHÔNG chọn nhóm / mã lý do.
        //    Việc phân loại là quyết định của ADMIN khi duyệt.
        //
        //    ⇒ Nếu khách có gửi kèm (web cũ / client khác) thì vẫn validate như
        //      trước để dữ liệu không mâu thuẫn. Nếu không có ⇒ để null, Admin
        //      sẽ xác định nhóm lý do khi review.
        RefundReason group = request.reason();
        RefundReasonCode reasonCode = null;
        if (group != null) {
            reasonCode = request.reasonCode() == null || request.reasonCode().isBlank()
                    ? null
                    : validateReasonCode(group, request.reasonCode());
        }

        // 6. Bằng chứng bắt buộc.
        //
        // ⚠️ BẮT BUỘC phải có ảnh chụp biên lai giao dịch thành công (không tính
        // video) — quản trị viên cần đối chiếu số tiền thực trả.
        // Ngoài ra, một số mã lý do do Admin cấu hình còn YÊU CẦU bằng chứng.
        List<String> attachments = normalizeAttachments(request.evidenceAttachments());
        if (!hasImageAttachment(attachments)) {
            throw new AppException(ErrorCode.REFUND_EVIDENCE_REQUIRED,
                    "Vui lòng đính kèm ảnh chụp biên lai giao dịch thành công.");
        }
        if (reasonCode != null && reasonCode.isRequireEvidence() && attachments.isEmpty()) {
            throw new AppException(ErrorCode.REFUND_EVIDENCE_REQUIRED,
                    "Lý do \"" + reasonCode.getName() + "\" yêu cầu đính kèm bằng chứng (ảnh hoặc video).");
        }

        // 7. Tính số tiền đề xuất — hệ thống tự tính, Tourist không tự nhập.
        //    Mốc so sánh cửa sổ no-show là THỜI ĐIỂM KHÁCH GỬI YÊU CẦU (now).
        //
        //    ⚠️ Khách KHÔNG chọn nhóm lý do ⇒ chưa biết tỷ lệ hoàn ⇒ số tiền đề
        //    xuất = 0 và ADMIN quyết định sau (xem `reviewRefund`).
        BigDecimal proposed = group == null
                ? BigDecimal.ZERO
                : calculateRefundAmount(payment.getAmount(), group, experienceDate, Instant.now());

        User tourist = userRepository.findById(touristId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        RefundRequest refund = RefundRequest.builder()
                .refundCode(generateRefundCode())
                .payment(payment)
                .tourist(tourist)
                .status(RefundStatus.PENDING_REVIEW)
                .declaredReason(group)
                .declaredReasonCode(reasonCode != null ? reasonCode.getCode() : null)
                .reasonSummary(request.reasonSummary() != null ? request.reasonSummary().trim() : null)
                .reasonDetail(request.reasonDetail())
                .evidence(request.evidence())
                .evidenceAttachments(writeAttachments(attachments))
                .proposedAmount(proposed)
                .currency(payment.getCurrency())
                .bankAccountNumber(request.bankAccountNumber())
                .bankAccountName(request.bankAccountName())
                .bankName(request.bankName())
                .contactPhone(request.contactPhone() != null ? request.contactPhone().trim() : null)
                .contactEmail(request.contactEmail() != null ? request.contactEmail().trim() : null)
                .build();

        RefundRequest saved = refundRepository.save(refund);

        audit(saved, RefundAuditLog.Action.CREATED, null, RefundStatus.PENDING_REVIEW, tourist,
                proposed, saved.getRefundCode(),
                // Mô tả sạch — số tiền hiển thị ở cột riêng, lý do ở cột riêng.
                "Tourist gửi yêu cầu hoàn tiền.");

        log.info("[Refund] Đã tạo yêu cầu hoàn tiền id={} code={} payment={} amount={}",
                saved.getId(), saved.getRefundCode(), payment.getId(), proposed);

        String bookingCode = payment.getBooking() != null ? payment.getBooking().getBookingCode() : "";
        // ⚠️ Khách KHÔNG chọn nhóm lý do ⇒ chưa có tỷ lệ ⇒ chưa có số tiền đề
        // xuất ⇒ thông báo cho Admin biết cần phân loại, không báo nhầm "0 đ".
        String body = group == null
                ? tourist.getFullName() + " gửi yêu cầu hoàn tiền cho đơn " + bookingCode
                        + " (mã " + saved.getRefundCode() + "). Chưa phân loại nguyên nhân — cần duyệt."
                : tourist.getFullName() + " yêu cầu hoàn " + NotificationPublisher.money(proposed)
                        + " cho đơn " + bookingCode + " (mã " + saved.getRefundCode() + "). Cần duyệt.";
        notifications.send(NotificationType.REFUND_REQUESTED)
                .toRole(Role.ADMIN)
                .title("Yêu cầu hoàn tiền mới")
                .body(body)
                .link("/admin/finance")
                .ref("REFUND", saved.getId())
                .queue(NotificationPublisher.Queue.REFUND_REVIEW)
                .publish();

        return toResponse(saved);
    }

    /**
     * Kiểm tra mã lý do chi tiết thuộc đúng nhóm lý do đã chọn.
     *
     * <p>Tourist BẮT BUỘC chọn mã lý do cụ thể trong nhóm — không chọn chung chung
     * để Admin phải suy đoán.
     */
    private RefundReasonCode validateReasonCode(RefundReason group, String reasonCode) {
        if (reasonCode == null || reasonCode.isBlank()) {
            throw new AppException(ErrorCode.REFUND_REASON_CODE_REQUIRED,
                    "Vui lòng chọn lý do cụ thể trong nhóm \"" + groupLabel(group) + "\".");
        }
        RefundReasonCode entity = reasonConfig.requireReasonCode(reasonCode.trim());
        if (entity.getGroup() == null || !entity.getGroup().getCode().equals(group.name())) {
            throw new AppException(ErrorCode.REFUND_REASON_CODE_MISMATCH,
                    "Mã lý do \"" + entity.getName() + "\" không thuộc nhóm lý do đã chọn.");
        }
        if (!entity.isActive()) {
            throw new AppException(ErrorCode.REFUND_REASON_CODE_NOT_FOUND,
                    "Lý do \"" + entity.getName() + "\" hiện không còn khả dụng. Vui lòng chọn lý do khác.");
        }
        return entity;
    }

    /** Nhãn tiếng Việt của nhóm lý do (fallback về mã khi chưa có cấu hình). */
    private String groupLabel(RefundReason group) {
        if (group == null) return "";
        return reasonConfig.getGroups(false).stream()
                .filter(g -> g.code().equals(group.name()))
                .map(com.journeygo.modules.refund.dto.response.RefundReasonGroupResponse::name)
                .findFirst()
                .orElse(group.name());
    }

    /** Chuẩn hoá danh sách URL bằng chứng — bỏ rỗng, cắt khoảng trắng, giữ thứ tự. */
    private List<String> normalizeAttachments(List<String> raw) {
        if (raw == null) {
            return List.of();
        }
        return raw.stream()
                .filter(url -> url != null && !url.isBlank())
                .map(String::trim)
                .distinct()
                .toList();
    }

    /**
     * Danh sách bằng chứng có chứa ít nhất MỘT ẢNH (không tính video) hay không.
     *
     * <p>Khách BẮT BUỘC phải tải lên ảnh chụp biên lai giao dịch thành công.
     */
    private boolean hasImageAttachment(List<String> attachments) {
        if (attachments == null || attachments.isEmpty()) {
            return false;
        }
        return attachments.stream().anyMatch(this::isImageAttachment);
    }

    /** Phân biệt URL ảnh với URL video (file mở rộng). */
    private boolean isImageAttachment(String url) {
        if (url == null || url.isBlank()) {
            return false;
        }
        String lower = url.toLowerCase(Locale.ROOT);
        if (lower.contains(".mp4") || lower.contains(".mov") || lower.contains(".webm")
                || lower.contains(".m3u8") || lower.contains(".mkv") || lower.contains(".avi")) {
            return false;
        }
        return lower.contains(".jpg") || lower.contains(".jpeg") || lower.contains(".png")
                || lower.contains(".webp") || lower.contains(".gif") || lower.contains(".heic")
                || lower.contains(".bmp") || lower.contains(".avif");
    }

    /** Ghi danh sách bằng chứng xuống DB dưới dạng JSON array. */    private String writeAttachments(List<String> attachments) {
        if (attachments.isEmpty()) {
            return null;
        }
        try {
            return objectMapper.writeValueAsString(attachments);
        } catch (JsonProcessingException e) {
            log.warn("[Refund] Không ghi được danh sách bằng chứng: {}", e.getMessage());
            return null;
        }
    }

    /**
     * Tính số tiền hoàn theo nhóm lý do + thời điểm hủy (Quy tắc 5).
     *
     * <p>Chính sách hoàn tiền:
     * <ul>
     *   <li>Nhóm cá nhân: hủy trước 3 ngày khởi hành → 50%; hủy trong vòng 48 giờ
     *       hoặc không xuất hiện → 0%.</li>
     *   <li>Nhóm nền tảng / đối tác → 100%.</li>
     *   <li>Nhóm bất khả kháng → 0%.</li>
     * </ul>
     *
     * <p>Tỷ lệ theo nhóm đọc từ cấu hình của Admin
     * ({@code refund_reason_groups}); tỷ lệ 0% của cá nhân khi hủy quá muộn là
     * ngoại lệ do chính sách quy định, không phụ thuộc cấu hình.
     */
    public BigDecimal calculateRefundAmount(BigDecimal paymentAmount,
                                            RefundReason group,
                                            LocalDate experienceDate,
                                            Instant requestTime) {
        if (paymentAmount == null) {
            return BigDecimal.ZERO;
        }
        if (group == null) {
            return BigDecimal.ZERO;
        }

        BigDecimal rate;

        if (group == RefundReason.PERSONAL) {
            // Lỗi cá nhân: hủy quá muộn (trong vòng 48 giờ) hoặc no-show → không hoàn.
            if (isWithinNoShowWindow(experienceDate, requestTime)) {
                rate = BigDecimal.ZERO;
            } else {
                rate = reasonConfig.refundRateOf(group);
            }
        } else {
            rate = reasonConfig.refundRateOf(group);
        }

        return paymentAmount.multiply(rate).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Tính số tiền hoàn từ nguyên nhân đã lưu — dùng khi Admin duyệt lại.
     *
     * <p>⚠️ Không dùng overload này cho nhóm PERSONAL: hàm không biết thời điểm khách
     * gửi yêu cầu nên không áp dụng được cửa sổ no-show 48h. Dùng overload có
     * {@code experienceDate} + {@code requestTime}.
     */
    public BigDecimal calculateRefundAmount(BigDecimal paymentAmount, RefundReason group) {
        if (paymentAmount == null || group == null) {
            return BigDecimal.ZERO;
        }
        BigDecimal rate = reasonConfig.refundRateOf(group);
        return paymentAmount.multiply(rate).setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Yêu cầu có nằm trong cửa sổ no-show không (hủy quá muộn / không xuất hiện).
     *
     * <p>Cửa sổ tính từ thời điểm bắt đầu ngày trải nghiệm lùi {@code noShowWindowHours}.
     *
     * <p>⚠️ Mốc so sánh là THỜI ĐIỂM KHÁCH GỬI YÊU CẦU ({@code requestTime}), KHÔNG phải
     * thời điểm Admin duyệt. Nếu dùng "now" thì một yêu cầu hợp lệ gửi từ 3 ngày trước
     * sẽ bị tính thành 0% chỉ vì Admin duyệt chậm 2 ngày.
     */
    private boolean isWithinNoShowWindow(LocalDate experienceDate, Instant requestTime) {
        if (experienceDate == null) {
            return false;
        }
        Instant when = requestTime != null ? requestTime : Instant.now();
        int windowHours = financeProperties.effectiveRefundNoShowWindowHours();
        Instant startOfExperience = experienceDate.atStartOfDay(VIETNAM_ZONE).toInstant();
        Instant noShowDeadline = startOfExperience.minus(Duration.ofHours(windowHours));
        return when.isAfter(noShowDeadline);
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
            // ⚠️ Đường thoát duy nhất cho yêu cầu đang chờ VNPay: DUYỆT LẠI với
            // phương thức chuyển khoản thủ công. Chỉ cho phép khi VNPay đã
            // xác nhận DỨT KHOÁT là không tạo được giao dịch hoàn (mã 99 —
            // hạ tầng không hỗ trợ; hoặc 91/93/95/16, trạng thái 09 — từ chối)
            // ⇒ chắc chắn không có giao dịch hoàn nào tồn tại ở phía VNPay ⇒
            // không có rủi ro hoàn tiền hai lần.
            boolean reReviewToManual =
                    (refund.getStatus() == RefundStatus.VNPAY_PROCESSING
                            || refund.getStatus() == RefundStatus.FAILED)
                            && refund.getMethod() == RefundMethod.VNPAY_API
                            && request.method() == RefundMethod.MANUAL_BANK_TRANSFER;
            if (!reReviewToManual) {
                throw new AppException(ErrorCode.REFUND_INVALID_STATUS,
                        "Yêu cầu hoàn tiền không ở trạng thái chờ duyệt (hiện tại: " + refund.getStatus() + ")");
            }
            boolean unsupported = isVnPayUnsupportedFailure(
                    refund.getVnpResponseCode(), refund.getVnpMessage());
            boolean definiteRejection = isVnPayDefiniteRejection(
                    refund.getVnpResponseCode(), refund.getVnpTransactionStatus());
            if (!unsupported && !definiteRejection) {
                throw new AppException(ErrorCode.REFUND_METHOD_NOT_ALLOWED,
                        "Chỉ chuyển sang chuyển khoản thủ công khi VNPay đã xác nhận không tạo được "
                                + "yêu cầu hoàn tiền (mã 99 hoặc từ chối dứt khoát 91/93/95/16). "
                                + "Hiện tại chưa có phản hồi như vậy nên yêu cầu vẫn đang được giữ "
                                + "ở trạng thái chờ VNPay xác nhận.");
            }
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
                    null, null, "Quản trị viên từ chối yêu cầu hoàn tiền. Lý do: " + reason);
            log.info("[Refund] Admin {} từ chối yêu cầu hoàn tiền id={}", adminId, refundId);
            notifications.send(NotificationType.REFUND_REJECTED)
                    .to(refund.getTourist() == null ? null : refund.getTourist().getId())
                    .title("Yêu cầu hoàn tiền chưa được chấp nhận")
                    .body("Yêu cầu " + refund.getRefundCode() + " đã bị từ chối. Lý do: " + reason.trim())
                    .ref("REFUND", refund.getId())
                    .queue(NotificationPublisher.Queue.REFUNDS)
                    .publish();
            notifications.queueChanged(Role.ADMIN, NotificationPublisher.Queue.REFUND_REVIEW);
            return toResponse(refund);
        }

        // ── Phê duyệt ──────────────────────────────────────────────────────────
        RefundReason approvedReason = request.reason() != null ? request.reason() : refund.getDeclaredReason();
        if (approvedReason == null) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Vui lòng xác định nhóm lý do hoàn tiền trước khi phê duyệt.");
        }

        // Mã lý do chi tiết do Admin xác định — phải thuộc nhóm lý do đã chọn.
        String approvedReasonCode = request.reasonCode() != null && !request.reasonCode().isBlank()
                ? request.reasonCode().trim()
                : refund.getDeclaredReasonCode();
        if (approvedReasonCode != null && !approvedReasonCode.isBlank()) {
            RefundReasonCode code = reasonConfig.requireReasonCode(approvedReasonCode);
            if (code.getGroup() == null || !code.getGroup().getCode().equals(approvedReason.name())) {
                throw new AppException(ErrorCode.REFUND_REASON_CODE_MISMATCH,
                        "Mã lý do \"" + code.getName() + "\" không thuộc nhóm lý do đã chọn.");
            }
            approvedReasonCode = code.getCode();
        }

        // Số tiền do hệ thống tính theo nhóm lý do — Admin chỉ có thể điều chỉnh
        // trong phạm vi chính sách (tức là bằng số tiền hệ thống tính cho nhóm đó).
        //
        // Lưu ý: với nhóm PERSONAL phải tính CẢ thời điểm khách gửi yêu cầu
        // (cửa sổ no-show 48h) — nếu dùng "lúc Admin duyệt" thì một yêu cầu hợp lệ
        // gửi từ 3 ngày trước sẽ bị tính thành 0% chỉ vì Admin duyệt chậm.
        LocalDate experienceDate = refund.getPayment().getBooking() != null
                ? refund.getPayment().getBooking().getExperienceDate()
                : null;
        BigDecimal policyAmount = calculateRefundAmount(
                refund.getPayment().getAmount(), approvedReason,
                experienceDate, refund.getCreatedAt());

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
        refund.setApprovedReasonCode(approvedReasonCode);
        // ⚠️ BẮT BUỘC lưu phương thức hoàn — nếu không, cột `method` NULL ⇒
        // tác vụ nền `findByStatusAndMethod(VNPAY_PROCESSING, VNPAY_API)` KHÔNG
        // quét được yêu cầu này ⇒ yêu cầu kẹt vĩnh viễn ở "Chờ VNPay xác nhận hoàn tiền".
        refund.setMethod(method);
        refundRepository.save(refund);

        // ── Hoàn 0%: không có giao dịch hoàn tiền nào để thực hiện ───────────────
        // Áp dụng cho: bất khả kháng, hoặc khách hủy quá muộn / no-show.
        // Yêu cầu vẫn được duyệt (ghi nhận tỷ lệ 0% + lý do quyết định) nhưng
        // không gọi VNPay và không chuyển khoản.
        if (policyAmount.compareTo(BigDecimal.ZERO) == 0) {
            Instant resolvedAt = Instant.now();
            refund.markRefunded(BigDecimal.ZERO, resolvedAt);
            refundRepository.save(refund);

            audit(refund, RefundAuditLog.Action.APPROVED, fromStatus, RefundStatus.APPROVED, admin,
                    BigDecimal.ZERO, null,
                    "Quản trị viên phê duyệt yêu cầu hoàn tiền theo chính sách 0% (nhóm "
                            + approvedReason + ")"
                            + (request.note() != null && !request.note().isBlank()
                            ? ". Ghi chú: " + request.note() : ""));
            audit(refund, RefundAuditLog.Action.STATUS_UPDATED, RefundStatus.APPROVED,
                    RefundStatus.REFUNDED, admin, BigDecimal.ZERO, refund.getRefundCode(),
                    "Yêu cầu được xử lý theo chính sách không hoàn tiền — không thực hiện giao dịch hoàn.");

            log.info("[Refund] Admin {} duyệt hoàn 0% theo nhóm {} — refund id={}",
                    adminId, approvedReason, refundId);

            notifications.send(NotificationType.REFUND_APPROVED)
                    .to(refund.getTourist() == null ? null : refund.getTourist().getId())
                    .title("Yêu cầu hoàn tiền đã được xử lý")
                    .body("Yêu cầu " + refund.getRefundCode() + " được xử lý theo chính sách không hoàn tiền. "
                            + "Lý do: " + groupLabel(approvedReason) + ".")
                    .ref("REFUND", refund.getId())
                    .queue(NotificationPublisher.Queue.REFUNDS)
                    .publish();
            notifications.queueChanged(Role.ADMIN, NotificationPublisher.Queue.REFUND_REVIEW);

            publishRefundedEvent(refund, resolvedAt);
            return toResponse(refund);
        }

        audit(refund, RefundAuditLog.Action.APPROVED, fromStatus, RefundStatus.APPROVED, admin,
                policyAmount, null,
                // Số tiền hiển thị ở cột riêng ⇒ không lặp lại trong mô tả.
                "Quản trị viên phê duyệt hoàn tiền qua phương thức "
                        + (method == RefundMethod.VNPAY_API
                        ? "VNPay" : "chuyển khoản ngân hàng thủ công")
                        + (request.note() != null && !request.note().isBlank()
                        ? ". Ghi chú: " + request.note() : ""));

        log.info("[Refund] Admin {} duyệt hoàn tiền id={} amount={} method={}",
                adminId, refundId, policyAmount, method);

        notifications.send(NotificationType.REFUND_APPROVED)
                .to(refund.getTourist() == null ? null : refund.getTourist().getId())
                .title("Yêu cầu hoàn tiền đã được duyệt")
                .body("JourneyGo đang hoàn " + NotificationPublisher.money(policyAmount) + " cho yêu cầu "
                        + refund.getRefundCode() + ". Chúng tôi sẽ báo ngay khi tiền về tài khoản của bạn.")
                .ref("REFUND", refund.getId())
                .queue(NotificationPublisher.Queue.REFUNDS)
                .publish();
        notifications.queueChanged(Role.ADMIN, NotificationPublisher.Queue.REFUND_REVIEW);

        // ── Thực hiện hoàn tiền theo phương thức được chọn ─────────────────────
        if (method == RefundMethod.VNPAY_API) {
            return executeVnPayRefund(refund, admin);
        }
        // MANUAL_BANK_TRANSFER — chờ Admin xác nhận đã chuyển khoản (kèm bằng chứng)
        refund.markManualTransferPending();
        refundRepository.save(refund);
        audit(refund, RefundAuditLog.Action.MANUAL_TRANSFER_RECORDED, RefundStatus.APPROVED,
                RefundStatus.MANUAL_TRANSFER_PENDING, admin, policyAmount, null,
                "Yêu cầu hoàn tiền bằng chuyển khoản thủ công đã được tạo. "
                        + "Quản trị viên thực hiện chuyển khoản rồi nhập mã tham chiếu và bằng chứng để xác nhận.");

        return toResponse(refund);
    }

    // ── VNPay Refund ──────────────────────────────────────────────────────────

    /**
     * Gửi yêu cầu hoàn tiền tới VNPay và ghi nhận phản hồi.
     *
     * <p>QUAN TRỌNG (UC-04): phản hồi {@code vnp_ResponseCode=00} chỉ có nghĩa "yêu cầu đã
     * được tiếp nhận" — KHÔNG có nghĩa tiền đã về tài khoản. Vì vậy:
     * <ul>
     *   <li>Phản hồi không xác minh được (timeout / mất mạng) → giữ {@code VNPAY_PROCESSING}.</li>
     *   <li>Phản hồi cho biết đang xử lý (status 05/06) → giữ {@code VNPAY_PROCESSING}.</li>
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

        // ⚠️ Loại hoàn phải khớp với SỐ TIỀN thực tế:
        //   • `02` = hoàn TOÀN PHẦN (số tiền = toàn bộ số tiền đã thanh toán)
        //   • `03` = hoàn MỘT PHẦN (số tiền < số tiền đã thanh toán)
        // Gửi `02` cho lần hoàn 50% ⇒ VNPay từ chối (mã 93/13) vì số tiền hoàn
        // không khớp "toàn phần" ⇒ giao dịch không hề được ghi nhận trên
        // trang quản trị VNPay.
        boolean fullRefund = refund.getApprovedAmount() != null
                && refund.getApprovedAmount().compareTo(payment.getAmount()) >= 0;

        Map<String, String> response = vnPayClient.requestRefund(
                payment.getTxnRef(),
                refund.getApprovedAmount(),
                payment.getVnpTransactionNo(),
                transactionDate,
                createdBy,
                fullRefund);

        refund.setVnpRequestedAt(Instant.now());
        refund.setVnpTxnRef(payment.getTxnRef());

        if (response.isEmpty()) {
            // UC-05 — timeout / không xác định được kết quả → giữ VNPAY_PROCESSING.
            refund.setVnpMessage("Không nhận được phản hồi từ VNPay — giữ trạng thái chờ xác minh.");
            refund.markVnPayProcessing();
            refundRepository.save(refund);
            audit(refund, RefundAuditLog.Action.VNPAY_REQUEST_SENT, RefundStatus.APPROVED,
                    RefundStatus.VNPAY_PROCESSING, admin, refund.getApprovedAmount(), refund.getRefundCode(),
                    "Đã gửi yêu cầu hoàn tiền tới VNPay nhưng chưa nhận được phản hồi "
                            + "(kết nối chậm hoặc gián đoạn). Yêu cầu vẫn được giữ ở trạng thái "
                            + "đang xử lý và sẽ không bị gửi lại tự động để tránh hoàn trùng.");
            log.warn("[Refund] Không nhận được phản hồi VNPay cho refund id={} — giữ VNPAY_PROCESSING", refund.getId());
            return toResponse(refund);
        }

        refund.setVnpResponseCode(response.get("vnp_ResponseCode"));
        refund.setVnpTransactionStatus(response.get("vnp_TransactionStatus"));
        refund.setVnpMessage(userFacingVnPayMessage(response.get("vnp_ResponseCode"),
                response.get("vnp_Message")));
        String txnNo = response.get("vnp_TransactionNo");
        if (txnNo != null && !txnNo.isBlank()) {
            refund.setVnpTransactionNo(txnNo);
        }
        String requestId = response.get("vnp_RequestId");
        if (requestId != null && !requestId.isBlank()) {
            refund.setVnpRequestId(requestId);
        }
        refund.setVnpRawResponse(response.toString());

        // ⚠️ KHÔNG ghi mã phản hồi / thông điệp kỹ thuật của VNPay vào nhật ký.
        // Mã 99 + "Unexpected error" là lỗi hạ tầng, vô nghĩa với người dùng và
        // chỉ gây hoang mang ⇒ chỉ ghi thông điệp mà người dùng đọc được.
        String responseCode = response.get("vnp_ResponseCode");
        String vnpMessage = response.get("vnp_Message");
        boolean technicalFailure = "99".equals(responseCode)
                || (vnpMessage != null && vnpMessage.trim().equalsIgnoreCase("Unexpected error"));
        String auditDetail = technicalFailure
                ? "VNPay đã phản hồi yêu cầu hoàn tiền nhưng chưa xác nhận được kết quả."
                : "VNPay đã phản hồi yêu cầu hoàn tiền."
                        + (vnpMessage != null && !vnpMessage.isBlank() ? " " + vnpMessage : "");

        audit(refund, RefundAuditLog.Action.VNPAY_RESPONSE, RefundStatus.APPROVED, refund.getStatus(),
                admin, refund.getApprovedAmount(), requestId, auditDetail);

        applyVnPayRefundStatus(refund, admin);

        log.info("[Refund] Đã gửi yêu cầu hoàn tiền VNPay id={} status={} code={}",
                refund.getId(), refund.getStatus(), refund.getVnpResponseCode());

        return toResponse(refund);
    }

    /**
     * Chuẩn hoá thông điệp VNPay để KHÔNG BAO GIỜ lộ thông tin kỹ thuật cho người dùng.
     *
     * VNPay trả về {@code vnp_ResponseCode = 99} kèm {@code vnp_Message = "Unexpected error"}
     * khi lỗi nằm ở phía hạ tầng/cấu hình (không phải lỗi nghiệp vụ) ⇒ thông điệp này
     * không mang ý nghĩa gì với người dùng. Thay bằng thông báo tiếng Việt rõ ràng.
     *
     * @param responseCode mã phản hồi của VNPay
     * @param message      thông điệp thô từ VNPay
     * @return thông điệp an toàn để hiển thị, hoặc {@code null} nếu không có gì để hiện
     */
    private String userFacingVnPayMessage(String responseCode, String message) {
        boolean technicalFailure = "99".equals(responseCode)
                || (message != null && message.trim().equalsIgnoreCase("Unexpected error"))
                || (message != null && message.trim().equalsIgnoreCase("System error"));
        if (technicalFailure) {
            return "Cổng thanh toán chưa xác nhận được kết quả. Yêu cầu vẫn được giữ ở trạng thái đang xử lý.";
        }
        return (message == null || message.isBlank()) ? null : message;
    }

    /**
     * VNPay có phản hồi "hạ tầng không hỗ trợ" không?
     *
     * <p><b>Bối cảnh (đã xác minh bằng thử nghiệm thực tế):</b> endpoint
     * {@code https://sandbox.vnpayment.vn/merchant_webapi/api/transaction} trả
     * {@code vnp_ResponseCode = 99} / {@code "Unexpected error"} cho MỌI lệnh
     * ({@code querydr} và {@code refund}), với MỌI {@code vnp_TmnCode} (kể cả mã
     * không tồn tại), với MỌI thuật toán checksum (HMAC-SHA512 / HMAC-SHA256 /
     * SHA256 / MD5, chuỗi pipe hay chuỗi key=value), với cả kiểu dữ liệu JSON
     * số lẫn chuỗi, và cả khi cố tình làm sai checksum.
     *
     * <p>Điểm mấu chốt: tài liệu chính thức quy địch mã {@code 97} cho checksum
     * sai và mã {@code 02} cho {@code vnp_TmnCode} không hợp lệ — nhưng ta
     * <b>không bao giờ</b> nhận được hai mã đó ⇒ request bị từ chối ở tầng
     * trước bước kiểm tra checksum/merchant. Đây là đặc điểm của môi trường
     * Sandbox, KHÔNG phải giới hạn quyền sử dụng (VNPay đã xác nhận bằng văn bản
     * rằng API hoàn tiền được phép dùng bình thường với {@code G46V3SQ0}).
     *
     * <p>⇒ Khi gặp mã 99, yêu cầu hoàn sẽ kẹt ở {@code VNPAY_PROCESSING} mãi mãi
     * (tác vụ nền cũng chỉ hỏi lại, không giải quyết được) ⇒ cần một đường thoát
     * để Admin chuyển sang hoàn tiền thủ công.
     *
     * @return {@code true} nếu mã phản hồi là 99 (lỗi hạ tầng / tính năng bị giới hạn)
     */
    private boolean isVnPayUnsupportedFailure(String responseCode, String message) {
        if ("99".equals(responseCode)) {
            return true;
        }
        return message != null && message.trim().equalsIgnoreCase("Unexpected error");
    }

    /**
     * VNPay đã <b>từ chối dứt khoát</b> yêu cầu hoàn tiền chưa?
     *
     * <p>Theo tài liệu chính thức, các mã dưới đây nghĩa là yêu cầu KHÔNG được
     * tạo ở phía VNPay ⇒ giao dịch hoàn chắc chắn không tồn tại ⇒ Admin được
     * phép chuyển sang chuyển khoản thủ công mà không lo hoàn tiền hai lần:
     * <ul>
     *   <li>{@code 09} — trạng thái giao dịch "Hoàn trả bị từ chối"</li>
     *   <li>{@code 91} — không tìm thấy giao dịch yêu cầu hoàn trả</li>
     *   <li>{@code 93} — số tiền hoàn trả không hợp lệ</li>
     *   <li>{@code 95} — giao dịch không thành công bên VNPAY, từ chối xử lý</li>
     *   <li>{@code 16} — không thực hiện được hoàn tiền trong thời gian này</li>
     * </ul>
     *
     * <p>⚠️ Mã {@code 94} ("đã được gửi yêu cầu hoàn tiền trước đó, VNPAY đang
     * xử lý") và {@code 08} ("hệ thống đang bảo trì") <b>KHÔNG</b> nằm trong danh
     * sách này — chúng để ngỏ khả năng giao dịch hoàn ĐÃ được tạo ⇒ tuyệt đối
     * không chuyển sang thủ công.
     *
     * @param responseCode mã phản hồi {@code vnp_ResponseCode}
     * @param transactionStatus trạng thái giao dịch {@code vnp_TransactionStatus}
     * @return {@code true} nếu VNPay đã dứt khoát từ chối
     */
    private boolean isVnPayDefiniteRejection(String responseCode, String transactionStatus) {
        if ("09".equals(transactionStatus)) {
            return true;
        }
        if (responseCode == null) {
            return false;
        }
        return switch (responseCode) {
            case "91", "93", "95", "16" -> true;
            default -> false;
        };
    }

    /**
     * Áp dụng trạng thái giao dịch hoàn tiền từ VNPay vào RefundRequest.
     */
    private void applyVnPayRefundStatus(RefundRequest refund, User admin) {
        String responseCode = refund.getVnpResponseCode();
        String transactionStatus = refund.getVnpTransactionStatus();

        // Chưa xác minh được kết quả → giữ VNPAY_PROCESSING
        if (!"00".equals(responseCode)) {
            refund.markVnPayProcessing();
            refundRepository.save(refund);
            audit(refund, RefundAuditLog.Action.VNPAY_STATUS_UPDATED, refund.getStatus(),
                    RefundStatus.VNPAY_PROCESSING, admin, null, refund.getVnpRequestId(),
                    "VNPay chưa xác nhận kết quả hoàn tiền. Yêu cầu vẫn được giữ ở trạng thái đang xử lý.",
                    true);
            return;
        }

        String status = transactionStatus == null ? "" : transactionStatus;
        switch (status) {
            case "00" -> {
                // Xác minh thành công — chỉ đây mới được chuyển REFUNDED.
                Instant resolvedAt = Instant.now();
                refund.markRefunded(refund.getApprovedAmount(), resolvedAt);
                refundRepository.save(refund);
                audit(refund, RefundAuditLog.Action.VNPAY_STATUS_UPDATED, RefundStatus.VNPAY_PROCESSING,
                        RefundStatus.REFUNDED, admin, refund.getRefundedAmount(), refund.getVnpTransactionNo(),
                        "VNPay xác nhận hoàn tiền thành công " + formatAmountForAudit(refund.getRefundedAmount())
                                + ". Tiền đã được hoàn về tài khoản của khách.");
                publishRefundedEvent(refund, resolvedAt);
            }
            case "09" -> {
                refund.markFailed(responseCode, transactionStatus, refund.getVnpMessage());
                refundRepository.save(refund);
                audit(refund, RefundAuditLog.Action.VNPAY_STATUS_UPDATED, refund.getStatus(),
                        RefundStatus.FAILED, admin, null, refund.getVnpTransactionNo(),
                        "VNPay từ chối yêu cầu hoàn tiền. Khách cần được hỗ trợ hoàn tiền "
                                + "bằng phương thức chuyển khoản thủ công.");
            }
            default -> {
                // 05 (đang xử lý) / 06 (đã gửi ngân hàng) / 01 → chờ xác minh.
                refund.markVnPayProcessing();
                refundRepository.save(refund);
                audit(refund, RefundAuditLog.Action.VNPAY_STATUS_UPDATED, refund.getStatus(),
                        RefundStatus.VNPAY_PROCESSING, admin, null, refund.getVnpTransactionNo(),
                        "VNPay đang xử lý yêu cầu hoàn tiền. Yêu cầu vẫn được giữ ở trạng thái đang xử lý.",
                        true);
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
        // ⚠️ Chỉ yêu cầu đang chờ CHUYỂN KHOẢN THỦ CÔNG mới được ghi nhận.
        // Yêu cầu đang chờ VNPay (VNPAY_PROCESSING) chưa kết thúc ⇒ chuyển sang
        // thủ công lúc này có thể hoàn tiền hai lần.
        if (refund.getStatus() != RefundStatus.MANUAL_TRANSFER_PENDING) {
            throw new AppException(ErrorCode.REFUND_INVALID_STATUS,
                    "Trạng thái hiện tại không cho phép ghi nhận chuyển khoản thủ công: " + refund.getStatus());
        }

        // UC-06 — CHỈ có MỘT phương thức hoàn tiền tại mỗi thời điểm.
        //
        // ⚠️ Bug đã sửa: trước đây điều kiện này xét vnpRequestedAt/vnpResponseCode
        // một cách vô điều kiện ⇒ sau khi Admin đã chuyển sang thủ công
        // (`switchToManualTransfer` giữ nguyên vnpRequestedAt + vnpResponseCode="99"
        // để lưu dấu vết), lệnh ghi nhận "Đã chuyển khoản" bị chặn vĩnh viễn ⇒
        // yêu cầu kẹt ở VNPAY_PROCESSING mà không thể đóng.
        //
        // ⇒ Chỉ chặn khi phương thức HIỆN TẠI vẫn là VNPay. Nếu đã chuyển sang
        // thủ công thì VNPay đã được xác nhận không hỗ trợ ⇒ không còn rủi ro
        // hoàn tiền hai lần.
        if (refund.getMethod() == RefundMethod.VNPAY_API
                && refund.getVnpRequestedAt() != null
                && refund.getVnpResponseCode() != null
                && !"00".equals(refund.getVnpResponseCode())
                && !"09".equals(refund.getVnpTransactionStatus())) {
            throw new AppException(ErrorCode.REFUND_METHOD_NOT_ALLOWED,
                    "Yêu cầu hoàn tiền đang được gửi tới VNPay và chưa xác minh được kết quả — "
                            + "không thể ghi nhận chuyển khoản thủ công để tránh hoàn tiền hai lần. "
                            + "Hãy dùng thao tác “Chuyển thủ công” trước.");
        }

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        Instant transferredAt = request.transferredAt() != null ? request.transferredAt() : Instant.now();
        refund.setTransferReference(request.transferReference());
        refund.setTransferEvidence(request.transferEvidence());
        refund.setTransferredAt(transferredAt);
        refundRepository.save(refund);

        audit(refund, RefundAuditLog.Action.MANUAL_TRANSFER_CONFIRMED, RefundStatus.MANUAL_TRANSFER_PENDING,
                RefundStatus.MANUAL_TRANSFER_PENDING, admin, refund.getApprovedAmount(),
                request.transferReference(),
                "Quản trị viên đã thực hiện chuyển khoản thủ công. Mã tham chiếu: "
                        + request.transferReference() + ".");

        // Hoàn tiền thủ công chỉ được coi là thành công khi có bằng chứng xác minh.
        // Bằng chứng = mã tham chiếu (bắt buộc) + mô tả/URL bằng chứng.
        boolean hasEvidence = request.transferEvidence() != null && !request.transferEvidence().isBlank();
        if (!hasEvidence) {
            log.warn("[Refund] Chuyển khoản thủ công id={} chưa có bằng chứng — giữ MANUAL_TRANSFER_PENDING", refundId);
            return toResponse(refund);
        }

        Instant resolvedAt = Instant.now();
        refund.markRefunded(refund.getApprovedAmount(), resolvedAt);
        refundRepository.save(refund);

        audit(refund, RefundAuditLog.Action.STATUS_UPDATED, RefundStatus.MANUAL_TRANSFER_PENDING,
                RefundStatus.REFUNDED, admin, refund.getRefundedAmount(), request.transferReference(),
                "Đã xác minh chuyển khoản thủ công thành công " + formatAmountForAudit(refund.getRefundedAmount())
                        + ". Tiền đã được hoàn về tài khoản của khách.");

        publishRefundedEvent(refund, resolvedAt);

        log.info("[Refund] Xác nhận hoàn tiền thủ công thành công id={} amount={}",
                refundId, refund.getRefundedAmount());

        return toResponse(refund);
    }

    /**
     * Chuyển yêu cầu hoàn từ phương thức VNPay sang chuyển khoản thủ công.
     *
     * <p><b>Vì sao cần?</b> Trên VNPay Sandbox, endpoint
     * {@code merchant_webapi/api/transaction} trả {@code vnp_ResponseCode = 99}
     * cho mọi lệnh (đã xác minh bằng thử nghiệm thực tế — xem
     * {@link #isVnPayUnsupportedFailure}). Khi đó yêu cầu kẹt ở
     * {@code VNPAY_PROCESSING} mãi mãi và không có đường nào để hoàn
     * tiền cho khách.
     *
     * <p>⇒ Endpoint này cho phép Admin chuyển sang chuyển khoản ngân hàng thủ công
     * (thực hiện ngoài hệ thống, rồi ghi nhận bằng chứng qua
     * {@code confirmManualTransfer}).
     *
     * <p><b>Chống hoàn tiền hai lần:</b> chỉ cho chuyển khi VNPay đã phản hồi dứt
     * khoát là KHÔNG hỗ trợ (mã 99) — tức là chắc chắn giao dịch hoàn KHÔNG được
     * tạo ở phía VNPay. Nếu chưa có phản hồi rõ ràng ⇒ vẫn giữ nguyên trạng thái
     * chờ xác minh để tránh rủi ro hoàn trùng.
     *
     * <p><b>Sau khi chuyển:</b> {@code method} = {@link RefundMethod#MANUAL_BANK_TRANSFER}
     * ⇒ tác vụ nền {@code RefundStatusScheduler} NGỪNG hỏi VNPay cho yêu cầu này
     * (nó chỉ quét {@code method = VNPAY_API}) ⇒ đảm bảo chỉ MỘT phương thức
     * hoàn tiền tại mỗi thời điểm.
     *
     * @param refundId yêu cầu hoàn tiền
     * @param adminId  quản trị viên thực hiện
     * @return yêu cầu hoàn sau khi chuyển phương thức
     */
    @Transactional
    public RefundResponse switchToManualTransfer(Long refundId, Long adminId) {
        RefundRequest refund = refundRepository.findByIdForUpdate(refundId)
                .orElseThrow(() -> new AppException(ErrorCode.REFUND_NOT_FOUND));

        if (refund.getStatus() != RefundStatus.VNPAY_PROCESSING
                && refund.getStatus() != RefundStatus.REFUND_PROCESSING
                && refund.getStatus() != RefundStatus.APPROVED
                && refund.getStatus() != RefundStatus.FAILED) {
            throw new AppException(ErrorCode.REFUND_INVALID_STATUS,
                    "Trạng thái hiện tại không cho phép chuyển phương thức hoàn tiền: "
                            + refund.getStatus());
        }
        if (refund.getMethod() == RefundMethod.MANUAL_BANK_TRANSFER) {
            // Đã là phương thức thủ công ⇒ không làm gì (idempotent).
            return toResponse(refund);
        }

        // ⚠️ Chỉ chuyển được khi VNPay đã nói rõ "KHÔNG tạo được giao dịch hoàn":
        //   • mã 99 (hạ tầng không hỗ trợ) — đã xác minh trên Sandbox
        //   • mã 91/93/95/16 hoặc trạng thái 09 — VNPay từ chối dứt khoát
        // Mọi trường hợp khác (chưa phản hồi, timeout, mã 08 bảo trì, mã 94 đang
        // xử lý…) ⇒ chưa chắc chắn giao dịch hoàn chưa được tạo ⇒ KHÔNG chuyển.
        boolean unsupported = isVnPayUnsupportedFailure(
                refund.getVnpResponseCode(), refund.getVnpMessage());
        boolean definiteRejection = isVnPayDefiniteRejection(
                refund.getVnpResponseCode(), refund.getVnpTransactionStatus());

        if (!unsupported && !definiteRejection) {
            throw new AppException(ErrorCode.REFUND_METHOD_NOT_ALLOWED,
                    "Chỉ chuyển sang chuyển khoản thủ công khi VNPay đã xác nhận không tạo được "
                            + "yêu cầu hoàn tiền (mã 99 hoặc từ chối dứt khoát 91/93/95/16). "
                            + "Hiện tại chưa có phản hồi như vậy nên yêu cầu vẫn đang được giữ "
                            + "ở trạng thái chờ xác minh.");
        }

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        RefundStatus fromStatus = refund.getStatus();
        refund.setMethod(RefundMethod.MANUAL_BANK_TRANSFER);
        refund.markManualTransferPending();
        refundRepository.save(refund);

        audit(refund, RefundAuditLog.Action.MANUAL_TRANSFER_RECORDED, fromStatus,
                RefundStatus.MANUAL_TRANSFER_PENDING, admin, refund.getApprovedAmount(), null,
                "Cổng thanh toán không hỗ trợ yêu cầu hoàn tiền tự động. "
                        + "Chuyển sang phương thức chuyển khoản ngân hàng thủ công — "
                        + "quản trị viên thực hiện chuyển khoản rồi nhập mã tham chiếu và bằng chứng.");

        log.info("[Refund] Chuyển yêu cầu hoàn id={} sang chuyển khoản thủ công (VNPay không hỗ trợ)",
                refundId);

        return toResponse(refund);
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

        if (refund.getStatus() != RefundStatus.VNPAY_PROCESSING
                && refund.getStatus() != RefundStatus.REFUND_PROCESSING) {
            return toResponse(refund);
        }
        if (refund.getMethod() != RefundMethod.VNPAY_API) {
            // Chuyển khoản thủ công — Admin tự xác nhận qua endpoint confirmManualTransfer.
            return toResponse(refund);
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
            refund.setVnpMessage("Không xác minh được trạng thái từ VNPay — giữ VNPAY_PROCESSING.");
            refundRepository.save(refund);
            return toResponse(refund);
        }

        String transactionStatus = response.get("vnp_TransactionStatus");
        refund.setVnpResponseCode(response.get("vnp_ResponseCode"));
        refund.setVnpTransactionStatus(transactionStatus);
        refund.setVnpMessage(userFacingVnPayMessage(response.get("vnp_ResponseCode"),
                response.get("vnp_Message")));
        refund.setVnpRawResponse(response.toString());

        // Trạng thái giao dịch gốc vẫn là 00 (đã thanh toán) — không phải trạng thái hoàn tiền.
        // Vì vậy chỉ khi chính phản hồi refund đã ghi nhận thành công mới chuyển REFUNDED.
        audit(refund, RefundAuditLog.Action.VNPAY_STATUS_UPDATED, RefundStatus.VNPAY_PROCESSING,
                RefundStatus.VNPAY_PROCESSING, null, null, refund.getVnpRequestId(),
                "Đã kiểm tra lại trạng thái hoàn tiền với VNPay. Yêu cầu vẫn đang được xử lý.",
                true);

        applyVnPayRefundStatus(refund, null);

        return toResponse(refund);
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public RefundResponse getById(Long refundId, Long callerId, boolean isAdmin) {
        RefundRequest refund = refundRepository.findById(refundId)
                .orElseThrow(() -> new AppException(ErrorCode.REFUND_NOT_FOUND));
        if (!isAdmin) {
            checkOwnership(refund, callerId);
        }
        RefundResponse response = toResponse(refund);
        return withAuditLogs(response, refund.getId());
    }

    @Transactional(readOnly = true)
    public RefundResponse getByCode(String refundCode) {
        RefundRequest refund = refundRepository.findByRefundCode(refundCode)
                .orElseThrow(() -> new AppException(ErrorCode.REFUND_NOT_FOUND));
        return withAuditLogs(toResponse(refund), refund.getId());
    }

    @Transactional(readOnly = true)
    public PageResponse<RefundResponse> getMyRefunds(Long touristId, Pageable pageable) {
        Page<RefundRequest> page = refundRepository.findByTourist_Id(touristId, pageable);
        Map<Long, List<RefundResponse.RefundAuditLogResponse>> logs = loadAuditLogs(page.getContent());
        return PageResponse.from(page, r -> {
            RefundResponse response = toResponse(r);
            return response.toBuilder()
                    .auditLogs(logs.getOrDefault(r.getId(), List.of()))
                    .build();
        });
    }

    /**
     * Danh sách yêu cầu hoàn tiền theo BOOKING (mọi payment của đơn) — dùng để app
     * biết đơn đang/có yêu cầu hoàn tiền mà không cần gọi từng payment.
     */
    @Transactional(readOnly = true)
    public List<RefundResponse> getByBooking(Long bookingId, Long callerId, boolean isAdmin) {
        if (!isAdmin) {
            Booking booking = bookingRepository.findById(bookingId)
                    .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
            Long ownerId = booking.getTourist() != null ? booking.getTourist().getId() : null;
            boolean isOwner = ownerId != null && ownerId.equals(callerId);
            // Hành khách được MỜI (linked user) cũng cần xem trạng thái hoàn tiền
            // của đơn mình tham gia — app dùng endpoint này để ẩn thẻ "Bạn đã mua
            // tour này" khi đơn đang/đã hoàn tiền.
            boolean isGuest = !isOwner && passengerRepository
                    .findByLinkedUserIdAndBooking_StatusIn(
                            callerId,
                            List.of(BookingStatus.CONFIRMED, BookingStatus.COMPLETED))
                    .stream()
                    .anyMatch(p -> p.getBooking() != null
                            && bookingId.equals(p.getBooking().getId()));
            if (!isOwner && !isGuest) {
                throw new AppException(ErrorCode.UNAUTHORIZED, "Bạn không có quyền truy cập đơn hàng này");
            }
        }
        List<RefundRequest> refunds = refundRepository
                .findByBooking_IdOrderByCreatedAtDesc(bookingId);
        Map<Long, List<RefundResponse.RefundAuditLogResponse>> logs = loadAuditLogs(refunds);
        return refunds.stream()
                .map(r -> {
                    RefundResponse response = toResponse(r);
                    return response.toBuilder()
                            .auditLogs(logs.getOrDefault(r.getId(), List.of()))
                            .build();
                })
                .toList();
    }

    /**
     * Danh sách yêu cầu hoàn tiền (ADMIN) — có tìm kiếm theo từ khoá.
     *
     * @param keyword từ khoá (mã yêu cầu / mã đơn / mã giao dịch / mã lý do /
     *               mô tả lý do). Rỗng ⇒ không lọc.
     */
    @Transactional(readOnly = true)
    public PageResponse<RefundResponse> searchAll(RefundStatus status, String keyword, Pageable pageable) {
        String kw = keyword == null ? "" : keyword.trim();
        Page<RefundRequest> page;
        if (kw.isEmpty()) {
            page = (status != null)
                    ? refundRepository.findByStatus(status, pageable)
                    : refundRepository.findAll(pageable);
        } else if (status != null) {
            page = refundRepository.searchByKeywordAndStatus(kw, status, pageable);
        } else {
            page = refundRepository.searchByKeyword(kw, pageable);
        }
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
        Map<Long, List<RefundResponse.RefundAuditLogResponse>> logs = loadAuditLogs(page.getContent());
        return PageResponse.from(page, r -> {
            RefundResponse response = toResponse(r);
            return response.toBuilder()
                    .auditLogs(logs.getOrDefault(r.getId(), List.of()))
                    .build();
        });
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
                        || r.getStatus().isPendingResult())
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

        // Một điểm chung cho cả VNPay xác nhận, chuyển khoản thủ công và RefundStatusScheduler
        notifications.send(NotificationType.REFUND_COMPLETED)
                .to(refund.getTourist() == null ? null : refund.getTourist().getId())
                .title("Đã hoàn tiền thành công")
                .body(NotificationPublisher.money(refund.getRefundedAmount()) + " của yêu cầu " + refund.getRefundCode()
                        + " đã được hoàn. Thời gian tiền về tài khoản tùy theo ngân hàng của bạn.")
                .ref("REFUND", refund.getId())
                .queue(NotificationPublisher.Queue.REFUNDS)
                .publish();
        notifications.queueChanged(Role.ADMIN, NotificationPublisher.Queue.REFUND_REVIEW);
    }

    private RefundResponse withAuditLogs(RefundResponse response, Long refundId) {
        List<RefundResponse.RefundAuditLogResponse> logs = auditLogRepository
                .findByRefundRequest_IdOrderByCreatedAtAsc(refundId).stream()
                .map(RefundResponse.RefundAuditLogResponse::fromEntity)
                .toList();
        return response.toBuilder().auditLogs(logs).build();
    }

    /**
     * Gắn nhật ký kiểm toán cho NHIỀU yêu cầu cùng lúc (tránh N+1 query).
     *
     * <p>Dùng cho các endpoint trả danh sách. Nhật ký được sắp xếp theo thời gian
     * TĂNG dần ⇒ cũ nhất ở trên, mới nhất ở dưới (đúng như mong muốn hiển thị).
     *
     * @param refunds danh sách response đã map từ entity
     * @return map {@code refundId → danh sách nhật ký đã sắp xếp}
     */
    private Map<Long, List<RefundResponse.RefundAuditLogResponse>> loadAuditLogs(
            List<RefundRequest> refunds) {
        if (refunds == null || refunds.isEmpty()) {
            return Map.of();
        }
        List<Long> ids = refunds.stream().map(RefundRequest::getId).toList();
        Map<Long, List<RefundResponse.RefundAuditLogResponse>> grouped = new LinkedHashMap<>();
        auditLogRepository.findByRefundRequest_IdInOrderByCreatedAtAsc(ids)
                .forEach(log -> grouped
                        .computeIfAbsent(log.getRefundRequest().getId(), k -> new ArrayList<>())
                        .add(RefundResponse.RefundAuditLogResponse.fromEntity(log)));
        return grouped;
    }

    /**
     * Chuyển entity → response, kèm TÊN HIỂN THỊ tiếng Việt của lý do.
     *
     * <p>Mã kỹ thuật (nhóm: {@code PERSONAL} / mã lý do: {@code PERSONAL_7}) là chi
     * tiết nội bộ ⇒ KHÔNG được hiển thị cho người dùng. Response luôn kèm sẵn tên
     * tiếng Việt để web/mobile chỉ cần hiển thị, không phải tự map mã → nhãn.
     */
    private RefundResponse toResponse(RefundRequest refund) {
        if (refund == null) {
            return null;
        }
        RefundResponse response = RefundResponse.fromEntity(refund);
        return response.toBuilder()
                .declaredReasonName(
                        response.declaredReason() != null
                                ? reasonConfig.groupName(response.declaredReason().name())
                                : null)
                .approvedReasonName(
                        response.approvedReason() != null
                                ? reasonConfig.groupName(response.approvedReason().name())
                                : null)
                .declaredReasonCodeName(reasonConfig.reasonCodeName(response.declaredReasonCode()))
                .approvedReasonCodeName(reasonConfig.reasonCodeName(response.approvedReasonCode()))
                .build();
    }

    private void checkOwnership(RefundRequest refund, Long callerId) {
        Long ownerId = refund.getTourist() != null ? refund.getTourist().getId() : null;
        if (ownerId == null || !ownerId.equals(callerId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED, "Bạn không có quyền truy cập yêu cầu hoàn tiền này");
        }
    }

    /** Ghi nhật log kiểm toán — append-only. */
    /**
     * Ghi nhận log kiểm toán — append-only.
     *
     * <p>detail KHÔNG được chứa thông tin kỹ thuật thô (map tham số VNPay, mã enum,
     * số tiền thô) — chỉ ghi câu mô tả mà người dùng đọc được.
     */
    private void audit(RefundRequest refund, RefundAuditLog.Action action, RefundStatus from, RefundStatus to,
                       User performedBy, BigDecimal amount, String reference, String detail) {
        audit(refund, action, from, to, performedBy, amount, reference, detail, false);
    }

    /**
     * Ghi nhận log kiểm toán, có tùy chọn bỏ qua nếu dòng tương đương đã tồn tại.
     *
     * <p>Tham số {@code skipIfIdentical} dùng cho các dòng "kiểm tra lại trạng thái"
     * mà KHÔNG làm thay đổi trạng thái: nếu đã có một dòng cùng
     * {@code action}/{@code fromStatus}/{@code toStatus} gần nhất thì KHÔNG ghi thêm
     * ⇒ nhật ký không bị nhân bản mỗi lần tác vụ nền quét lại.
     */
    private void audit(RefundRequest refund, RefundAuditLog.Action action, RefundStatus from, RefundStatus to,
                       User performedBy, BigDecimal amount, String reference, String detail,
                       boolean skipIfIdentical) {
        if (skipIfIdentical && hasIdenticalAuditLog(refund.getId(), action, from, to)) {
            log.debug("[Refund] Bỏ qua ghi nhận trùng lặp action={} refund id={}", action, refund.getId());
            return;
        }
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

    /**
     * Kiểm tra đã tồn tại dòng nhật ký cùng hành động và cùng cặp trạng thái chưa.
     *
     * <p>Chỉ xét dòng MỚI NHẤT của hành động đó: nếu dòng mới nhất đã trùng thì
     * lần ghi tiếp theo cũng sẽ trùng ⇒ bỏ qua luôn, tránh dồn dòng.
     */
    private boolean hasIdenticalAuditLog(Long refundId, RefundAuditLog.Action action,
                                         RefundStatus from, RefundStatus to) {
        List<RefundAuditLog> recent = auditLogRepository.findRecentByAction(
                refundId, action, PageRequest.of(0, 1));
        if (recent.isEmpty()) {
            return false;
        }
        RefundAuditLog last = recent.get(0);
        return java.util.Objects.equals(last.getFromStatus(), from)
                && java.util.Objects.equals(last.getToStatus(), to);
    }

    /**
     * Định dạng số tiền cho nhật ký kiểm toán — dùng định dạng tiền Việt Nam
     * để người đọc hiểu ngay, thay vì chuỗi số thô ("1500000.00").
     */
    private String formatAmountForAudit(BigDecimal amount) {
        if (amount == null) {
            return "—";
        }
        return NumberFormat.getCurrencyInstance(Locale.forLanguageTag("vi-VN")).format(amount) + " đ";
    }

    private String generateRefundCode() {
        return "RF" + UUID.randomUUID().toString().replace("-", "").substring(0, 20).toUpperCase();
    }
}
