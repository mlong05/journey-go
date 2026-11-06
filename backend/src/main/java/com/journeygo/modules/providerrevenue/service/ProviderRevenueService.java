package com.journeygo.modules.providerrevenue.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.common.security.AuthorizationGuard;
import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.booking.event.BookingCompletedEvent;
import com.journeygo.modules.booking.repository.BookingRepository;
import com.journeygo.modules.experience.entity.Experience;
import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.experience.repository.ExperienceRepository;
import com.journeygo.modules.finance.config.FinanceProperties;
import com.journeygo.modules.providerprofile.entity.ProviderProfile;
import com.journeygo.modules.providerprofile.repository.ProviderProfileRepository;
import com.journeygo.modules.providerrevenue.dto.response.EligibilityEvaluationResponse;
import com.journeygo.modules.providerrevenue.dto.response.ProviderRevenueResponse;
import com.journeygo.modules.providerrevenue.entity.ProviderRevenue;
import com.journeygo.modules.providerrevenue.entity.enums.DeferredReason;
import com.journeygo.modules.providerrevenue.entity.enums.ProviderRevenueStatus;
import com.journeygo.modules.providerrevenue.repository.ProviderRevenueRepository;
import com.journeygo.modules.payment.entity.Payment;
import com.journeygo.modules.payment.entity.enums.PaymentStatus;
import com.journeygo.modules.payment.repository.PaymentRepository;
import com.journeygo.modules.refund.entity.RefundRequest;
import com.journeygo.modules.refund.entity.enums.RefundStatus;
import com.journeygo.modules.refund.event.RefundCompletedEvent;
import com.journeygo.modules.refund.repository.RefundRequestRepository;
import com.journeygo.modules.settlement.entity.enums.FinancialAdjustmentStatus;
import com.journeygo.modules.settlement.repository.FinancialAdjustmentRepository;
import com.journeygo.modules.user.entity.User;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * ProviderProfile Revenue — ghi nhận và theo dõi doanh thu ProviderProfile.
 *
 * <p>Quy tắc nghiệp vụ (Mục 4 & 5 tài liệu):
 * <ul>
 *   <li><b>4.1</b> — Doanh thu gắn với Payment <b>thực sự</b> dùng để thanh toán Booking.
 *       Booking chỉ phát sinh doanh thu có thể tất toán <b>sau khi trải nghiệm hoàn thành</b>;
 *       ngày hoàn thành trải nghiệm là căn cứ xác định kỳ doanh thu.</li>
 *   <li><b>4.3</b> — Không chuyển {@code SETTLED} về {@code PENDING} để xử lý Refund —
 *       dùng giao dịch điều chỉnh riêng.</li>
 *   <li><b>5</b> — 9 điều kiện lọc đủ tư cách tất toán, đánh giá lại mỗi khi có sự kiện quan
 *       trọng (Booking hoàn thành, Payment xác minh, Refund có kết quả cuối cùng,
 *       Settlement bị từ chối/hủy).</li>
 *   <li><b>6</b> — Công thức: {@code NetCollected = Gross − Refund},
 *       {@code Commission = NetCollected × Rate},
 *       {@code ProviderProfileNet = NetCollected − Commission + Adjustments}.</li>
 * </ul>
 *
 * <p><b>Quy tắc "ghi nhận đúng một lần"</b>: mỗi cặp (Booking, ProviderProfile) chỉ có tối đa một bản
 * ghi doanh thu — ràng buộc duy nhất ở tầng database ({@code uk_provider_revenue_booking_provider}).
 * Bản ghi được tạo khi Payment được xác minh thành công và được <b>cập nhật</b> (không tạo mới)
 * khi có thêm thông tin (hoàn thành trải nghiệm, Refund có kết quả).
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProviderRevenueService {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final ProviderRevenueRepository revenueRepository;
    private final ProviderProfileRepository providerProfileRepository;
    private final BookingRepository bookingRepository;
    private final PaymentRepository paymentRepository;
    private final ExperienceRepository experienceRepository;
    private final RefundRequestRepository refundRepository;
    private final FinancialAdjustmentRepository financialAdjustmentRepository;
    private final FinanceProperties financeProperties;

    // ── Ghi nhận doanh thu ────────────────────────────────────────────────────

    /**
     * Ghi nhận doanh thu cho một Booking sau khi Payment được xác minh thành công.
     *
     * <p>Idempotent: nếu đã có bản ghi cho (Booking, ProviderProfile) thì chỉ cập nhật, KHÔNG tạo mới.
     * Điều này bảo đảm "một Booking — một nguồn doanh thu hợp lệ" và "không ghi nhận doanh thu
     * lần thứ hai" khi callback trùng (UC-04).
     *
     * @param booking Booking có Payment thành công
     * @param payment Payment đã được xác minh thành công
     */
    @Transactional
    public List<ProviderRevenueResponse> recordRevenueForBooking(Booking booking, Payment payment) {
        if (payment.getStatus() != PaymentStatus.SUCCESS) {
            log.warn("[ProviderRevenue] Payment {} chưa SUCCESS — không ghi nhận doanh thu", payment.getId());
            return List.of();
        }
        if (payment.isDuplicatePayment()) {
            // Khoản tiền dư (UC-04) — không tạo doanh thu ProviderProfile lần thứ hai.
            log.warn("[ProviderRevenue] Payment {} là khoản tiền DƯ — không ghi nhận doanh thu", payment.getId());
            return List.of();
        }

        Map<Long, BigDecimal> grossPerProviderProfile = resolveGrossPerProviderProfile(booking);
        if (grossPerProviderProfile.isEmpty()) {
            log.info("[ProviderRevenue] Booking {} không có ProviderProfile nào được ánh xạ — bỏ qua ghi nhận doanh thu",
                    booking.getId());
            return List.of();
        }

        List<ProviderRevenue> saved = new ArrayList<>();
        for (Map.Entry<Long, BigDecimal> entry : grossPerProviderProfile.entrySet()) {
            ProviderProfile providerProfile = providerProfileRepository.findById(entry.getKey()).orElse(null);
            if (providerProfile == null) {
                continue;
            }
            ProviderRevenue revenue = revenueRepository.findByBooking_IdAndProviderProfile_Id(booking.getId(), providerProfile.getId())
                    .orElseGet(() -> ProviderRevenue.builder()
                            .providerProfile(providerProfile)
                            .booking(booking)
                            .payment(payment)
                            .grossAmount(entry.getValue())
                            .status(ProviderRevenueStatus.PENDING)
                            .build());

            // Cập nhật các trường có thể thay đổi (payment gốc, giá trị).
            revenue.setPayment(payment);
            revenue.setGrossAmount(entry.getValue());
            revenue.setCommissionRate(resolveCommissionRate(providerProfile));

            // Kỳ doanh thu: ưu tiên tháng hoàn thành trải nghiệm; nếu chưa hoàn thành thì
            // tạm dùng tháng ngày trải nghiệm — sẽ cập nhật lại khi Booking hoàn thành.
            revenue.setCompletedDate(resolveCompletedDate(booking));
            revenue.setRevenuePeriod(ProviderRevenue.periodOf(resolveCompletedDate(booking)));

            refreshFinancials(revenue);
            revenueRepository.save(revenue);
            saved.add(revenue);
        }

        log.info("[ProviderRevenue] Đã ghi nhận doanh thu cho booking {} — {} providerProfile, gross={}",
                booking.getId(), saved.size(), payment.getAmount());
        return saved.stream().map(ProviderRevenueResponse::fromEntity).toList();
    }

    /**
     * Tính lại doanh thu và đánh giá lại điều kiện tất toán cho một Booking.
     *
     * <p>Được gọi khi: Booking hoàn thành, Refund có kết quả cuối cùng, Settlement bị từ chối.
     */
    @Transactional
    public void reevaluateForBooking(Long bookingId) {
        List<ProviderRevenue> revenues = revenueRepository.findByBooking_Id(bookingId);
        if (revenues.isEmpty()) {
            return;
        }
        for (ProviderRevenue revenue : revenues) {
            refreshFinancials(revenue);
            applyEligibility(revenue);
            revenueRepository.save(revenue);
        }
    }

    // ── Event listeners ───────────────────────────────────────────────────────

    /**
     * Booking hoàn thành trải nghiệm → cập nhật kỳ doanh thu và đánh giá lại điều kiện.
     */
    @EventListener
    @Transactional
    public void onBookingCompleted(BookingCompletedEvent event) {
        log.info("[ProviderRevenue] Nhận sự kiện Booking hoàn thành id={}", event.bookingId());
        reevaluateForBooking(event.bookingId());
    }

    /**
     * Refund hoàn tất thành công → cập nhật số tiền hoàn và tính lại doanh thu ProviderProfile.
     */
    @EventListener
    @Transactional
    public void onRefundCompleted(RefundCompletedEvent event) {
        log.info("[ProviderRevenue] Nhận sự kiện Refund hoàn thành id={} booking={}",
                event.refundId(), event.bookingId());
        if (event.bookingId() != null) {
            reevaluateForBooking(event.bookingId());
        }
    }

    // ── Đánh giá điều kiện (Mục 5 — 9 điều kiện) ─────────────────────────────

    /**
     * Đánh giá 9 điều kiện đủ tư cách tất toán và cập nhật trạng thái.
     *
     * <p>Điều kiện (theo bảng Mục 5):
     * <ol>
     *   <li>Payment thành công (đã xác minh).</li>
     *   <li>Booking hoàn thành trải nghiệm.</li>
     *   <li>Không có Refund chưa có kết quả cuối cùng (chờ duyệt / đang xử lý / chưa rõ).</li>
     *   <li>Đã cập nhật Refund thành công vào số tiền hoàn.</li>
     *   <li>Không có vấn đề đối soát (chưa có khoản điều chỉnh tài chính chờ xử lý).</li>
     *   <li>Chưa được tất toán (chấm theo ngữ cảnh — ứng viên hoặc duyệt).</li>
     *   <li>Đã tính được doanh thu ProviderProfile (hoa hồng + điều chỉnh đã tính).</li>
     *   <li>Doanh thu còn lại &gt; 0.</li>
     *   <li>Kỳ doanh thu đã kết thúc.</li>
     * </ol>
     */
    @Transactional(readOnly = true)
    public EligibilityEvaluationResponse evaluateEligibility(Long revenueId) {
        ProviderRevenue revenue = revenueRepository.findById(revenueId)
                .orElseThrow(() -> new AppException(ErrorCode.PROVIDER_REVENUE_NOT_FOUND));
        requireFinanceAccess(revenue);
        return evaluate(revenue, EvaluationMode.CANDIDATE, null);
    }

    /**
     * Đánh giá điều kiện khi DUYỆT một đợt tất toán.
     *
     * <p>Khác với {@link #evaluateEligibility(Long)} (chế độ ứng viên), ở chế độ này khoản
     * doanh thu ĐÃ được gắn vào đợt tất toán đang duyệt — nên điều kiện 6 được chấm theo
     * nghĩa "đúng thuộc đợt này và chưa bị tất toán", thay vì "chưa thuộc đợt nào".
     *
     * <p>Trước đây điều kiện 6 luôn yêu cầu {@code settlementId == null}, khiến mọi đợt
     * tất toán bị từ chối với lý do {@code FINANCIAL_REVIEW_REQUIRED} dù dữ liệu hoàn toàn hợp lệ.
     *
     * @param revenueId   khoản doanh thu
     * @param settlementId đợt tất toán đang duyệt
     */
    @Transactional(readOnly = true)
    public EligibilityEvaluationResponse evaluateForApproval(Long revenueId, Long settlementId) {
        ProviderRevenue revenue = revenueRepository.findById(revenueId)
                .orElseThrow(() -> new AppException(ErrorCode.PROVIDER_REVENUE_NOT_FOUND));
        requireFinanceAccess(revenue);
        return evaluate(revenue, EvaluationMode.APPROVAL, settlementId);
    }

    private EligibilityEvaluationResponse evaluate(ProviderRevenue revenue,
                                                   EvaluationMode mode,
                                                   Long settlementId) {
        List<EligibilityEvaluationResponse.CheckItem> checks = new ArrayList<>();
        DeferredReason deferred = null;

        // 1. Payment thành công — đã xác minh
        Payment payment = revenue.getPayment();
        boolean paymentOk = payment != null
                && payment.getStatus() == PaymentStatus.SUCCESS
                && !payment.isDuplicatePayment()
                && payment.getPaidAt() != null;
        checks.add(check("1_PAYMENT_VERIFIED", "Payment thành công đã được xác minh", paymentOk,
                paymentOk ? "OK" : "Payment chưa được xác minh thành công"));
        if (!paymentOk) deferred = DeferredReason.PAYMENT_NOT_VERIFIED;

        // 2. Booking hoàn thành trải nghiệm
        Booking booking = revenue.getBooking();
        boolean bookingCompleted = booking != null && booking.getStatus() == BookingStatus.COMPLETED;
        checks.add(check("2_BOOKING_COMPLETED", "Booking đã hoàn thành trải nghiệm", bookingCompleted,
                bookingCompleted ? "OK" : "Booking chưa hoàn thành trải nghiệm"));
        if (!bookingCompleted && deferred == null) deferred = DeferredReason.BOOKING_NOT_COMPLETED;

        // 3. Không có Refund chưa có kết quả cuối cùng
        List<RefundRequest> refunds = refundRepository.findByPayment_IdOrderByCreatedAtDesc(
                payment != null ? payment.getId() : -1L);
        List<RefundRequest> unresolved = refunds.stream()
                .filter(r -> r.getStatus() == RefundStatus.PENDING_REVIEW
                        || r.getStatus() == RefundStatus.APPROVED
                        || r.getStatus() == RefundStatus.REFUND_PROCESSING)
                .toList();
        checks.add(check("3_NO_PENDING_REFUND", "Không có Refund chưa có kết quả cuối cùng",
                unresolved.isEmpty(),
                unresolved.isEmpty() ? "OK"
                        : unresolved.size() + " yêu cầu refund đang chờ/processing"));
        if (!unresolved.isEmpty() && deferred == null) deferred = DeferredReason.REFUND_PENDING;

        // 4. Đã cập nhật Refund thành công — số tiền hoàn phải khớp tổng đã hoàn thành
        BigDecimal refundedTotal = refunds.stream()
                .filter(r -> r.getStatus() == RefundStatus.REFUNDED)
                .map(RefundRequest::getRefundedAmount)
                .filter(a -> a != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
        boolean refundApplied = revenue.getRefundAmount() != null
                && revenue.getRefundAmount().compareTo(refundedTotal) <= 0;
        checks.add(check("4_REFUND_APPLIED", "Số tiền Refund thành công đã được cập nhật", refundApplied,
                "refundAmount=" + revenue.getRefundAmount() + " / đã hoàn thành=" + refundedTotal));

        // 5. Không có vấn đề đối soát — chưa có khoản điều chỉnh tài chính chờ xử lý
        boolean hasPendingAdjustment = financialAdjustmentRepository
                .findByProviderProfile_IdAndStatus(revenue.getProviderProfile().getId(), FinancialAdjustmentStatus.PENDING)
                .stream()
                .anyMatch(a -> a.getRefundRequest() == null
                        || (a.getRefundRequest().getPayment() != null
                        && a.getRefundRequest().getPayment().getId().equals(payment != null ? payment.getId() : -1L)));
        checks.add(check("5_NO_RECONCILIATION_ISSUE", "Không có vấn đề đối soát tài chính",
                !hasPendingAdjustment,
                hasPendingAdjustment ? "Có khoản điều chỉnh tài chính chờ xử lý" : "OK"));
        if (hasPendingAdjustment && deferred == null) deferred = DeferredReason.FINANCIAL_REVIEW_REQUIRED;

        // 6. Chưa được tất toán
        //
        // QUAN TRỌNG: điều kiện này phụ thuộc ngữ cảnh.
        //  • Chế độ CANDIDATE (lúc xem ứng viên / tạo bản nháp): khoản doanh thu phải
        //    CHƯA thuộc đợt nào → status == ELIGIBLE và settlementId == null.
        //  • Chế độ APPROVAL (lúc duyệt): khoản doanh thu BẮT BUỘC đã ở IN_SETTLEMENT và
        //    trỏ đúng settlementId của đợt đang duyệt. Nếu chấm theo nghĩa "chưa thuộc
        //    đợt nào" thì mọi đợt tất toán sẽ luôn fail ở bước duyệt.
        boolean notSettled;
        String settledDetail;
        if (mode == EvaluationMode.APPROVAL) {
            boolean belongsToThisSettlement = revenue.getSettlementId() != null
                    && revenue.getSettlementId().equals(settlementId);
            boolean notSettledYet = revenue.getStatus() != ProviderRevenueStatus.SETTLED;
            notSettled = belongsToThisSettlement && notSettledYet;
            settledDetail = "status=" + revenue.getStatus()
                    + ", settlementId=" + revenue.getSettlementId()
                    + " (đợt đang duyệt=" + settlementId + ")";
        } else {
            notSettled = revenue.getStatus() != ProviderRevenueStatus.IN_SETTLEMENT
                    && revenue.getStatus() != ProviderRevenueStatus.SETTLED
                    && revenue.getSettlementId() == null;
            settledDetail = "status=" + revenue.getStatus()
                    + ", settlementId=" + revenue.getSettlementId();
        }
        checks.add(check("6_NOT_SETTLED",
                mode == EvaluationMode.APPROVAL
                        ? "Thuộc đúng đợt tất toán đang duyệt và chưa bị tất toán"
                        : "Chưa thuộc Settlement đang xử lý hoặc đã duyệt",
                notSettled, settledDetail));
        if (!notSettled && deferred == null) deferred = DeferredReason.FINANCIAL_REVIEW_REQUIRED;

        // 7. Đã tính được doanh thu ProviderProfile
        boolean calculated = revenue.getCommissionAmount() != null
                && revenue.getProviderNetAmount() != null
                && revenue.getCommissionRate() != null;
        checks.add(check("7_CALCULATED", "Hoa hồng và doanh thu ProviderProfile đã được tính", calculated,
                "commission=" + revenue.getCommissionAmount() + ", net=" + revenue.getProviderNetAmount()));
        if (!calculated && deferred == null) deferred = DeferredReason.FINANCIAL_REVIEW_REQUIRED;

        // 8. Doanh thu còn lại > 0
        BigDecimal net = revenue.getProviderNetAmount() != null ? revenue.getProviderNetAmount() : BigDecimal.ZERO;
        boolean positive = net.compareTo(BigDecimal.ZERO) > 0;
        checks.add(check("8_POSITIVE_NET", "Doanh thu còn lại sau Refund và điều chỉnh lớn hơn 0", positive,
                "providerNet=" + net));

        // 9. Kỳ doanh thu đã kết thúc — không tất toán doanh thu của kỳ chưa đóng.
        //
        // Điều kiện này chặn việc doanh thu kỳ TƯƠNG LAI (ví dụ 11/2026 khi hiện tại là
        // 10/2026) bị kéo vào đợt tất toán của kỳ đã đóng (ví dụ 09/2026) nhờ cơ chế
        // "doanh thu chuyển tiếp". Không có điều kiện này thì hệ thống có thể trả tiền
        // cho đối tác trước khi kỳ doanh thu thực sự kết thúc.
        boolean periodClosed = isPeriodClosed(revenue.getRevenuePeriod());
        checks.add(check("9_PERIOD_CLOSED", "Kỳ doanh thu đã kết thúc",
                periodClosed,
                periodClosed
                        ? "Kỳ " + revenue.getRevenuePeriod() + " đã đóng"
                        : "Kỳ " + revenue.getRevenuePeriod() + " chưa kết thúc — không được tất toán"));
        if (!periodClosed && deferred == null) deferred = DeferredReason.PERIOD_NOT_CLOSED;

        boolean eligible = checks.stream().allMatch(EligibilityEvaluationResponse.CheckItem::passed);
        if (!eligible && deferred == null) {
            deferred = DeferredReason.FINANCIAL_REVIEW_REQUIRED;
        }

        return EligibilityEvaluationResponse.builder()
                .eligible(eligible)
                .deferredReason(eligible ? null : deferred)
                .checks(checks)
                .build();
    }

    /**
     * Áp dụng kết quả đánh giá lên bản ghi doanh thu.
     *
     * <p>Không bao giờ hồi sinh khoản đã {@code SETTLED} (Mục 4.3) — trường hợp Refund phát
     * sinh sau tất toán được xử lý bằng khoản điều chỉnh tài chính riêng.
     */
    private void applyEligibility(ProviderRevenue revenue) {
        if (revenue.getStatus() == ProviderRevenueStatus.SETTLED
                || revenue.getStatus() == ProviderRevenueStatus.IN_SETTLEMENT) {
            return;
        }
        EligibilityEvaluationResponse evaluation = evaluate(revenue, EvaluationMode.CANDIDATE, null);
        if (evaluation.eligible()) {
            revenue.markEligible();
        } else {
            revenue.markPending(evaluation.deferredReason());
        }
    }

    // ── Tính toán tài chính ───────────────────────────────────────────────────

    /**
     * Cập nhật số tiền hoàn, hoa hồng và số tiền ProviderProfile được nhận.
     *
     * <p>Công thức (Mục 6):
     * <pre>
     * NetCollected     = GrossAmount − RefundAmount
     * Commission       = NetCollected × CommissionRate
     * ProviderNetAmount = NetCollected − Commission + AdjustmentAmount
     * </pre>
     */
    private void refreshFinancials(ProviderRevenue revenue) {
        // Tổng refund đã hoàn thành thành công của Payment gốc.
        BigDecimal refundedTotal = refundRepository
                .sumRefundedAmountByPayment(revenue.getPayment().getId());

        // Nếu Booking có nhiều ProviderProfile, mỗi ProviderProfile gánh một phần refund tương ứng với
        // tỷ lệ doanh thu của họ trong tổng giá trị Booking.
        BigDecimal bookingGross = totalGrossOfBooking(revenue.getBooking());
        BigDecimal share = refundedTotal;
        if (bookingGross != null && bookingGross.compareTo(BigDecimal.ZERO) > 0
                && revenue.getGrossAmount() != null) {
            share = refundedTotal.multiply(revenue.getGrossAmount())
                    .divide(bookingGross, 2, RoundingMode.HALF_UP);
        }

        revenue.setRefundAmount(share);
        revenue.recalculate();
    }

    /**
     * Tổng doanh thu (gross) của tất cả các ProviderProfile trong một Booking — dùng để phân bổ refund.
     */
    private BigDecimal totalGrossOfBooking(Booking booking) {
        return revenueRepository.findByBooking_Id(booking.getId()).stream()
                .map(ProviderRevenue::getGrossAmount)
                .filter(a -> a != null)
                .reduce(BigDecimal.ZERO, BigDecimal::add);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Xác định ProviderProfile và giá trị doanh thu (gross) của họ trong một Booking.
     *
     * <p>Ánh xạ: Booking → Tour → TourDestination → Destination → Experience → người tạo
     * (ProviderProfile). Giá trị gross của mỗi ProviderProfile = tổng giá các Experience do ProviderProfile đó tạo.
     */
    private Map<Long, BigDecimal> resolveGrossPerProviderProfile(Booking booking) {
        Map<Long, BigDecimal> result = new LinkedHashMap<>();
        if (booking.getTour() == null) {
            return result;
        }
        List<Long> destinationIds = booking.getTour().getTourDestinations() == null
                ? List.of()
                : booking.getTour().getTourDestinations().stream()
                        .map(td -> td.getDestination() != null ? td.getDestination().getId() : null)
                        .filter(java.util.Objects::nonNull)
                        .toList();
        if (destinationIds.isEmpty()) {
            return result;
        }

        List<Experience> experiences = experienceRepository
                .findByDestination_IdInOrderById(destinationIds);

        // Experience → userId (người tạo / ProviderProfile)
        List<Long> userIds = experiences.stream()
                .map(e -> e.getCreatedBy() != null ? e.getCreatedBy().getId() : null)
                .filter(java.util.Objects::nonNull)
                .distinct()
                .toList();
        if (userIds.isEmpty()) {
            return result;
        }

        Map<Long, Long> userIdToProviderProfileId = new LinkedHashMap<>();
        for (ProviderProfile providerProfile : providerProfileRepository.findByUserIds(userIds)) {
            userIdToProviderProfileId.put(providerProfile.getUser().getId(), providerProfile.getId());
        }

        for (Experience experience : experiences) {
            if (experience.getCreatedBy() == null) {
                continue;
            }
            Long providerProfileId = userIdToProviderProfileId.get(experience.getCreatedBy().getId());
            if (providerProfileId == null) {
                continue;
            }
            BigDecimal price = experience.getPrice() != null ? experience.getPrice() : BigDecimal.ZERO;
            result.merge(providerProfileId, price, BigDecimal::add);
        }
        return result;
    }

    /**
     * Tỷ lệ hoa hồng áp dụng — ưu tiên cấu hình riêng của ProviderProfile, sau đó mới tới mặc định.
     */
    private BigDecimal resolveCommissionRate(ProviderProfile providerProfile) {
        BigDecimal rate = providerProfile.getEffectiveCommissionRate();
        if (rate == null || rate.compareTo(BigDecimal.ZERO) == 0) {
            return financeProperties.getDefaultCommissionRate();
        }
        return rate;
    }

    /**
     * Ngày hoàn thành trải nghiệm — căn cứ xác định kỳ doanh thu.
     *
     * <p>Nếu Booking chưa hoàn thành, dùng tạm ngày trải nghiệm; khi Booking hoàn thành,
     * giá trị này được cập nhật lại theo {@code completedAt}.
     */
    private LocalDate resolveCompletedDate(Booking booking) {
        if (booking.getCompletedAt() != null) {
            return LocalDate.ofInstant(booking.getCompletedAt(), VIETNAM_ZONE);
        }
        return booking.getExperienceDate();
    }

    /**
     * Kỳ doanh thu đã kết thúc hay chưa.
     *
     * <p>Một kỳ {@code YYYY-MM} được coi là đã đóng khi kỳ đó <b>trước</b> tháng hiện tại.
     * Ví dụ: hôm nay 30/10/2026 ⇒ kỳ {@code 2026-09} đã đóng, kỳ {@code 2026-10} và
     * {@code 2026-11} chưa đóng.
     *
     * <p>Nếu cấu hình {@code app.finance.allow-open-period-settlement = true} thì kỳ hiện tại
     * cũng được coi là đã đóng (cho phép tất toán sớm). Kỳ TƯƠNG LAI (sau tháng hiện tại)
     * <b>luôn</b> chưa đóng — không bao giờ tất toán trước khi kỳ đó thực sự kết thúc.
     *
     * <p>Kỳ chưa đóng ⇒ không được tất toán. Điều này ngăn việc doanh thu kỳ tương lai bị
     * kéo vào đợt tất toán của kỳ đã đóng qua cơ chế "doanh thu chuyển tiếp".
     */
    private boolean isPeriodClosed(String revenuePeriod) {
        if (revenuePeriod == null || revenuePeriod.isBlank()) {
            return false;
        }
        try {
            YearMonth period = YearMonth.parse(revenuePeriod.trim());
            YearMonth current = YearMonth.now(VIETNAM_ZONE);
            if (period.isBefore(current)) {
                return true;
            }
            // Kỳ hiện tại — chỉ đóng khi Admin cho phép tất toán kỳ chưa kết thúc.
            return period.equals(current) && financeProperties.isAllowOpenPeriodSettlement();
        } catch (Exception e) {
            log.warn("[ProviderRevenue] Không đọc được kỳ doanh thu '{}' — coi như chưa đóng", revenuePeriod);
            return false;
        }
    }

    /**
     * Ngữ cảnh đánh giá điều kiện tất toán.
     */
    private enum EvaluationMode {
        /** Xem ứng viên / tạo bản nháp — khoản doanh thu chưa thuộc đợt nào. */
        CANDIDATE,
        /** Duyệt đợt tất toán — khoản doanh thu đã gắn vào đợt đang duyệt. */
        APPROVAL
    }

    private EligibilityEvaluationResponse.CheckItem check(String code, String description, boolean passed, String detail) {
        return EligibilityEvaluationResponse.CheckItem.builder()
                .code(code)
                .description(description)
                .passed(passed)
                .detail(detail)
                .build();
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public ProviderRevenueResponse getById(Long id) {
        ProviderRevenue revenue = revenueRepository.findById(id)
                .orElseThrow(() -> new AppException(ErrorCode.PROVIDER_REVENUE_NOT_FOUND));
        requireFinanceAccess(revenue);
        return ProviderRevenueResponse.fromEntity(revenue);
    }

    @Transactional(readOnly = true)
    public PageResponse<ProviderRevenueResponse> getByProviderProfile(Long providerProfileId, Pageable pageable) {
        requireFinanceAccessByProfileId(providerProfileId);
        Page<ProviderRevenue> page = revenueRepository.findByProviderProfile_IdOrderByCreatedAtDesc(providerProfileId, pageable);
        return PageResponse.from(page, ProviderRevenueResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public PageResponse<ProviderRevenueResponse> getByStatus(ProviderRevenueStatus status, Pageable pageable) {
        Page<ProviderRevenue> page = revenueRepository.findByStatus(status, pageable);
        return PageResponse.from(page, ProviderRevenueResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public List<ProviderRevenue> findEligibleByProviderProfile(Long providerProfileId) {
        return revenueRepository.findEligibleByProviderProfile(providerProfileId);
    }

    @Transactional(readOnly = true)
    public List<ProviderRevenue> findByBooking(Long bookingId) {
        List<ProviderRevenue> revenues = revenueRepository.findByBooking_Id(bookingId);
        // Một Booking có thể chứa Experience của nhiều đối tác — chỉ trả về các khoản
        // mà caller (Content Provider) sở hữu. ADMIN thì thấy tất cả.
        return revenues.stream()
                .filter(r -> AuthorizationGuard.isAdmin() || isOwnedByCurrentUser(r))
                .toList();
    }

    // ── Cô lập dữ liệu tài chính ─────────────────────────────────────────────

    /**
     * Chặn Content Provider đọc doanh thu của đối tác khác. ADMIN thì qua tất cả.
     */
    private void requireFinanceAccess(ProviderRevenue revenue) {
        ProviderProfile profile = revenue.getProviderProfile();
        User owner = profile == null ? null : profile.getUser();
        AuthorizationGuard.requireFinanceOwnerOrAdmin(owner == null ? null : owner.getId());
    }

    private void requireFinanceAccessByProfileId(Long providerProfileId) {
        ProviderProfile profile = providerProfileRepository.findById(providerProfileId)
                .orElseThrow(() -> new AppException(ErrorCode.PROVIDER_PROFILE_NOT_FOUND));
        User owner = profile.getUser();
        AuthorizationGuard.requireFinanceOwnerOrAdmin(owner == null ? null : owner.getId());
    }

    private boolean isOwnedByCurrentUser(ProviderRevenue revenue) {
        ProviderProfile profile = revenue.getProviderProfile();
        if (profile == null || profile.getUser() == null) {
            return false;
        }
        try {
            return profile.getUser().getId().equals(AuthorizationGuard.currentUserId());
        } catch (BusinessException e) {
            // Chưa xác thực → không ai sở hữu.
            return false;
        }
    }
}
