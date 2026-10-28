package com.journeygo.modules.settlement.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.finance.config.FinanceProperties;
import com.journeygo.modules.partner.entity.Partner;
import com.journeygo.modules.partner.repository.PartnerRepository;
import com.journeygo.modules.partnerrevenue.dto.response.EligibilityEvaluationResponse;
import com.journeygo.modules.partnerrevenue.dto.response.PartnerRevenueResponse;
import com.journeygo.modules.partnerrevenue.entity.PartnerRevenue;
import com.journeygo.modules.partnerrevenue.entity.enums.DeferredReason;
import com.journeygo.modules.partnerrevenue.entity.enums.PartnerRevenueStatus;
import com.journeygo.modules.partnerrevenue.repository.PartnerRevenueRepository;
import com.journeygo.modules.partnerrevenue.service.PartnerRevenueService;
import com.journeygo.modules.settlement.dto.request.CreateSettlementRequest;
import com.journeygo.modules.settlement.dto.request.RejectSettlementRequest;
import com.journeygo.modules.settlement.dto.response.SettlementCandidatesResponse;
import com.journeygo.modules.settlement.dto.response.SettlementDetailResponse;
import com.journeygo.modules.settlement.dto.response.SettlementResponse;
import com.journeygo.modules.settlement.entity.Settlement;
import com.journeygo.modules.settlement.entity.SettlementDetail;
import com.journeygo.modules.settlement.entity.enums.SettlementStatus;
import com.journeygo.modules.settlement.repository.SettlementDetailRepository;
import com.journeygo.modules.settlement.repository.SettlementRepository;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import com.journeygo.modules.wallet.entity.Wallet;
import com.journeygo.modules.wallet.repository.WalletRepository;
import com.journeygo.modules.wallet.service.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

/**
 * Settlement — đợt tất toán doanh thu cho Partner theo tháng dương lịch.
 *
 * <p>Quy tắc nghiệp vụ (Mục 7 & 9):
 * <ul>
 *   <li><b>7.1</b> — Kỳ tất toán dùng tháng dương lịch; chỉ tạo cho kỳ đã kết thúc.
 *       Mỗi Partner tối đa một Settlement đã duyệt cho mỗi kỳ.</li>
 *   <li><b>7.4</b> — Tạo bản nháp: các khoản được chọn chuyển {@code IN_SETTLEMENT}.
 *       Duyệt: đánh giá lại điều kiện, chuyển {@code APPROVED}, tạo giao dịch cộng tiền Wallet
 *       và chuyển các Partner Revenue sang {@code SETTLED} — TẤT CẢ trong cùng transaction.
 *       Từ chối: giải phóng các khoản doanh thu về {@code ELIGIBLE}/{@code PENDING},
 *       KHÔNG ghi tiền vào Wallet.</li>
 *   <li><b>9.6</b> — Duyệt phải nguyên tử; lỗi một bước → rollback toàn bộ.</li>
 *   <li><b>9.5</b> — Một Settlement chỉ tạo được một giao dịch cộng tiền.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class SettlementService {

    private final SettlementRepository settlementRepository;
    private final SettlementDetailRepository detailRepository;
    private final PartnerRevenueRepository revenueRepository;
    private final PartnerRepository partnerRepository;
    private final WalletRepository walletRepository;
    private final UserRepository userRepository;
    private final PartnerRevenueService revenueService;
    private final WalletService walletService;
    private final FinanceProperties financeProperties;

    // ── Ứng viên tất toán ────────────────────────────────────────────────────

    /**
     * Xem ứng viên tất toán của một Partner theo kỳ (chức năng "View Settlement Candidates").
     *
     * <p>Đánh giá lại điều kiện TẠI THỜI ĐIỂM GỌI — không tin hoàn toàn vào trạng thái tính từ trước.
     * Khoản chưa đủ điều kiện được giữ lại kèm lý do rõ ràng và được xét lại ở lần sau.
     *
     * <p>Chú ý (Mục 7.1): khoản đủ điều kiện từ kỳ trước cũng được đưa vào đợt tất toán kỳ này
     * (doanh thu chuyển tiếp) — nhưng vẫn giữ {@code revenuePeriod} gốc.
     */
    @Transactional
    public SettlementCandidatesResponse getCandidates(Long partnerId, String revenuePeriod) {
        Partner partner = partnerRepository.findById(partnerId)
                .orElseThrow(() -> new AppException(ErrorCode.PARTNER_NOT_FOUND));

        YearMonth period = parsePeriod(revenuePeriod);

        List<PartnerRevenue> eligible = new ArrayList<>();
        List<SettlementCandidatesResponse.HeldItem> held = new ArrayList<>();

        BigDecimal gross = BigDecimal.ZERO;
        BigDecimal refund = BigDecimal.ZERO;
        BigDecimal commission = BigDecimal.ZERO;
        BigDecimal adjustment = BigDecimal.ZERO;
        BigDecimal net = BigDecimal.ZERO;

        // Lấy TẤT CẢ khoản doanh thu của Partner thuộc kỳ (bất kể trạng thái) — bao gồm cả
        // các khoản chưa đủ điều kiện được giữ lại từ kỳ trước (doanh thu chuyển tiếp).
        List<PartnerRevenue> all = revenueRepository.findByPartnerAndPeriod(partnerId, revenuePeriod);

        // Ngoài ra: các khoản đủ điều kiện từ KỲ TRƯỚC (chưa được tất toán) — doanh thu chuyển tiếp.
        List<PartnerRevenue> carried = revenueRepository.findEligibleByPartner(partnerId).stream()
                .filter(r -> !revenuePeriod.equals(r.getRevenuePeriod()))
                .toList();

        List<PartnerRevenue> combined = new ArrayList<>(all);
        combined.addAll(carried);

        for (PartnerRevenue revenue : combined) {
            if (revenue.getStatus() == PartnerRevenueStatus.SETTLED
                    || revenue.getStatus() == PartnerRevenueStatus.IN_SETTLEMENT) {
                // Đã thuộc Settlement khác — không đưa vào ứng viên.
                continue;
            }

            // Đánh giá lại điều kiện tại thời điểm gọi.
            EligibilityEvaluationResponse evaluation = revenueService.evaluateEligibility(revenue.getId());

            if (evaluation.eligible()) {
                eligible.add(revenue);
                gross = gross.add(nz(revenue.getGrossAmount()));
                refund = refund.add(nz(revenue.getRefundAmount()));
                commission = commission.add(nz(revenue.getCommissionAmount()));
                adjustment = adjustment.add(nz(revenue.getAdjustmentAmount()));
                net = net.add(nz(revenue.getPartnerNetAmount()));
            } else {
                held.add(SettlementCandidatesResponse.HeldItem.builder()
                        .revenueId(revenue.getId())
                        .bookingId(revenue.getBooking() != null ? revenue.getBooking().getId() : null)
                        .revenuePeriod(revenue.getRevenuePeriod())
                        .partnerNetAmount(revenue.getPartnerNetAmount())
                        .deferredReason(evaluation.deferredReason())
                        .build());
            }
        }

        log.info("[Settlement] Ứng viên tất toán partner={} kỳ={}: {} khoản đủ điều kiện, {} khoản giữ lại",
                partner.getId(), revenuePeriod, eligible.size(), held.size());

        return SettlementCandidatesResponse.builder()
                .partnerId(partnerId)
                .revenuePeriod(revenuePeriod)
                .eligible(eligible.stream().map(PartnerRevenueResponse::fromEntity).toList())
                .held(held)
                .totals(SettlementCandidatesResponse.Totals.builder()
                        .grossAmount(gross)
                        .refundAmount(refund)
                        .commissionAmount(commission)
                        .adjustmentAmount(adjustment)
                        .settlementAmount(net)
                        .build())
                .build();
    }

    // ── Tạo bản nháp ──────────────────────────────────────────────────────────

    /**
     * Tạo bản nháp Settlement từ các khoản doanh thu đủ điều kiện.
     *
     * <p>Các khoản được chọn chuyển sang {@code IN_SETTLEMENT} và liên kết với Settlement —
     * không thể đưa vào đợt khác trong lúc chờ xử lý.
     */
    @Transactional
    public SettlementResponse createSettlement(CreateSettlementRequest request, Long adminId) {
        Partner partner = partnerRepository.findById(request.partnerId())
                .orElseThrow(() -> new AppException(ErrorCode.PARTNER_NOT_FOUND));

        YearMonth period = parsePeriod(request.revenuePeriod());
        validatePeriodClosed(period);

        // Mỗi Partner tối đa một Settlement đã duyệt cho mỗi kỳ (ràng buộc 9.4).
        if (settlementRepository.findByPartner_IdAndRevenuePeriodAndStatus(
                partner.getId(), request.revenuePeriod(), SettlementStatus.APPROVED).isPresent()) {
            throw new AppException(ErrorCode.SETTLEMENT_ALREADY_EXISTS,
                    "Đối tác đã có đợt tất toán được duyệt cho kỳ doanh thu " + request.revenuePeriod());
        }
        // Không tạo nhiều Settlement nháp cạnh tranh cho cùng Partner và kỳ.
        List<Settlement> existingForPeriod = settlementRepository.findByPartnerAndPeriod(
                partner.getId(), request.revenuePeriod());
        boolean hasOpenDraft = existingForPeriod.stream().anyMatch(s -> s.getStatus().isOpen());
        if (hasOpenDraft) {
            throw new AppException(ErrorCode.SETTLEMENT_ALREADY_EXISTS,
                    "Đã có đợt tất toán nháp đang chờ xử lý cho kỳ doanh thu " + request.revenuePeriod());
        }

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // Lọc ứng viên (đánh giá lại điều kiện tại thời điểm tạo bản nháp).
        SettlementCandidatesResponse candidates = getCandidates(partner.getId(), request.revenuePeriod());
        if (candidates.eligible() == null || candidates.eligible().isEmpty()) {
            throw new AppException(ErrorCode.SETTLEMENT_NO_ELIGIBLE_REVENUE,
                    "Không có khoản doanh thu nào đủ điều kiện để tất toán cho kỳ " + request.revenuePeriod());
        }

        Settlement settlement = Settlement.builder()
                .settlementCode(generateSettlementCode())
                .partner(partner)
                .revenuePeriod(request.revenuePeriod())
                .periodStart(period.atDay(1))
                .periodEnd(period.atEndOfMonth())
                .status(SettlementStatus.DRAFT)
                .createdBy(admin)
                .note(request.note())
                .build();

        Settlement saved = settlementRepository.save(settlement);

        BigDecimal gross = BigDecimal.ZERO;
        BigDecimal refund = BigDecimal.ZERO;
        BigDecimal commission = BigDecimal.ZERO;
        BigDecimal adjustment = BigDecimal.ZERO;
        BigDecimal net = BigDecimal.ZERO;

        for (PartnerRevenueResponse candidate : candidates.eligible()) {
            PartnerRevenue revenue = revenueRepository.findByIdForUpdate(candidate.id())
                    .orElseThrow(() -> new AppException(ErrorCode.PARTNER_REVENUE_NOT_FOUND));

            // Chống chọn trùng — khoản doanh thu đã thuộc Settlement khác.
            if (revenue.getStatus() != PartnerRevenueStatus.ELIGIBLE || revenue.getSettlementId() != null) {
                continue;
            }

            revenue.markInSettlement(saved.getId());
            revenueRepository.save(revenue);

            detailRepository.save(SettlementDetail.builder()
                    .settlement(saved)
                    .partnerRevenue(revenue)
                    .revenuePeriod(revenue.getRevenuePeriod())
                    .grossAmount(nz(revenue.getGrossAmount()))
                    .refundAmount(nz(revenue.getRefundAmount()))
                    .commissionAmount(nz(revenue.getCommissionAmount()))
                    .adjustmentAmount(nz(revenue.getAdjustmentAmount()))
                    .partnerNetAmount(nz(revenue.getPartnerNetAmount()))
                    .build());

            gross = gross.add(nz(revenue.getGrossAmount()));
            refund = refund.add(nz(revenue.getRefundAmount()));
            commission = commission.add(nz(revenue.getCommissionAmount()));
            adjustment = adjustment.add(nz(revenue.getAdjustmentAmount()));
            net = net.add(nz(revenue.getPartnerNetAmount()));
        }

        saved.setGrossAmount(gross);
        saved.setRefundAmount(refund);
        saved.setCommissionAmount(commission);
        saved.setAdjustmentAmount(adjustment);
        saved.setSettlementAmount(net);
        settlementRepository.save(saved);

        log.info("[Settlement] Đã tạo bản nháp settlement {} cho partner {} kỳ {} — tổng {}",
                saved.getSettlementCode(), partner.getId(), request.revenuePeriod(), net);

        return SettlementResponse.fromEntity(saved);
    }

    // ── Duyệt ─────────────────────────────────────────────────────────────────

    /**
     * Duyệt Settlement — kiểm tra lại điều kiện rồi cộng tiền vào Wallet.
     *
     * <p>Mục 7.5 — trước khi duyệt phải xác minh lại:
     * <ul>
     *   <li>Payment vẫn thành công đã xác minh; Booking vẫn hoàn thành.</li>
     *   <li>Không có Refund mới đang chờ xử lý hoặc chưa rõ kết quả.</li>
     *   <li>Số tiền Refund, hoa hồng, điều chỉnh vẫn chính xác.</li>
     *   <li>Các khoản doanh thu chưa được Settlement khác sử dụng.</li>
     *   <li>Settlement chưa được duyệt trước đó.</li>
     * </ul>
     *
     * <p>Mục 9.6 — cập nhật trạng thái Settlement + Partner Revenue + Wallet Transaction phải
     * thành công CÙNG NHAU; lỗi một bước → rollback toàn bộ.
     */
    @Transactional
    public SettlementResponse approveSettlement(Long settlementId, Long adminId) {
        Settlement settlement = settlementRepository.findByIdForUpdate(settlementId)
                .orElseThrow(() -> new AppException(ErrorCode.SETTLEMENT_NOT_FOUND));

        if (settlement.getStatus().isApproved()) {
            throw new AppException(ErrorCode.SETTLEMENT_ALREADY_APPROVED,
                    "Đợt tất toán đã được duyệt — không thể thao tác lại");
        }
        if (!settlement.getStatus().isOpen()) {
            throw new AppException(ErrorCode.SETTLEMENT_INVALID_STATUS,
                    "Trạng thái đợt tất toán không cho phép duyệt: " + settlement.getStatus());
        }

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        // ── Đánh giá lại toàn bộ điều kiện ─────────────────────────────────────
        List<PartnerRevenue> details = revenueRepository.findBySettlementId(settlementId);
        if (details.isEmpty()) {
            throw new AppException(ErrorCode.SETTLEMENT_NO_ELIGIBLE_REVENUE,
                    "Đợt tất toán không có khoản doanh thu nào");
        }

        BigDecimal recomputedGross = BigDecimal.ZERO;
        BigDecimal recomputedRefund = BigDecimal.ZERO;
        BigDecimal recomputedCommission = BigDecimal.ZERO;
        BigDecimal recomputedAdjustment = BigDecimal.ZERO;
        BigDecimal recomputedNet = BigDecimal.ZERO;

        for (PartnerRevenue revenue : details) {
            PartnerRevenue locked = revenueRepository.findByIdForUpdate(revenue.getId())
                    .orElseThrow(() -> new AppException(ErrorCode.PARTNER_REVENUE_NOT_FOUND));

            if (locked.getStatus() != PartnerRevenueStatus.IN_SETTLEMENT
                    || !settlementId.equals(locked.getSettlementId())) {
                throw new AppException(ErrorCode.SETTLEMENT_ELIGIBILITY_CHANGED,
                        "Khoản doanh thu " + locked.getId()
                                + " không còn thuộc đợt tất toán này — vui lòng cập nhật lại đợt tất toán");
            }

            // Tính lại từ dữ liệu hiện tại (refund, hoa hồng, điều chỉnh).
            revenueService.reevaluateForBooking(locked.getBooking().getId());
            revenueRepository.flush();

            EligibilityEvaluationResponse evaluation = revenueService.evaluateEligibility(locked.getId());
            if (!evaluation.eligible()) {
                throw new AppException(ErrorCode.SETTLEMENT_ELIGIBILITY_CHANGED,
                        "Khoản doanh thu (booking " + (locked.getBooking() != null
                                ? locked.getBooking().getId() : "?")
                                + ") không còn đủ điều kiện tất toán: " + evaluation.deferredReason()
                                + ". Vui lòng cập nhật lại đợt tất toán trước khi duyệt.");
            }

            recomputedGross = recomputedGross.add(nz(locked.getGrossAmount()));
            recomputedRefund = recomputedRefund.add(nz(locked.getRefundAmount()));
            recomputedCommission = recomputedCommission.add(nz(locked.getCommissionAmount()));
            recomputedAdjustment = recomputedAdjustment.add(nz(locked.getAdjustmentAmount()));
            recomputedNet = recomputedNet.add(nz(locked.getPartnerNetAmount()));
        }

        // Số tiền đã lưu trong bản nháp phải khớp với số tiền tính lại.
        if (settlement.getSettlementAmount() != null
                && settlement.getSettlementAmount().compareTo(recomputedNet) != 0) {
            throw new AppException(ErrorCode.SETTLEMENT_ELIGIBILITY_CHANGED,
                    "Số tiền đợt tất toán đã thay đổi (bản nháp: " + settlement.getSettlementAmount()
                            + ", tính lại: " + recomputedNet + ") — vui lòng cập nhật lại đợt tất toán");
        }

        // ── Ghi nhận tài chính ────────────────────────────────────────────────
        Wallet wallet = walletRepository.findByPartnerIdForUpdate(settlement.getPartner().getId())
                .orElseThrow(() -> new AppException(ErrorCode.WALLET_NOT_FOUND,
                        "Đối tác chưa có ví nội bộ — không thể tất toán"));

        settlement.approve(admin);
        settlement.setGrossAmount(recomputedGross);
        settlement.setRefundAmount(recomputedRefund);
        settlement.setCommissionAmount(recomputedCommission);
        settlement.setAdjustmentAmount(recomputedAdjustment);
        settlement.setSettlementAmount(recomputedNet);
        settlementRepository.save(settlement);

        // Một Settlement chỉ tạo được MỘT giao dịch cộng tiền (ràng buộc 9.5).
        walletService.creditFromSettlement(
                wallet,
                recomputedNet,
                settlement.getId(),
                admin,
                "Cộng tiền từ Settlement " + settlement.getSettlementCode()
                        + " (kỳ doanh thu " + settlement.getRevenuePeriod() + ")");

        // Chuyển các khoản doanh thu sang SETTLED.
        for (PartnerRevenue revenue : details) {
            PartnerRevenue locked = revenueRepository.findByIdForUpdate(revenue.getId())
                    .orElseThrow(() -> new AppException(ErrorCode.PARTNER_REVENUE_NOT_FOUND));
            locked.markSettled();
            revenueRepository.save(locked);
        }

        log.info("[Settlement] Đã duyệt settlement {} — cộng {} vào ví partner {}",
                settlement.getSettlementCode(), recomputedNet, settlement.getPartner().getId());

        return SettlementResponse.fromEntity(settlement);
    }

    // ── Từ chối / hủy ─────────────────────────────────────────────────────────

    /**
     * Từ chối (hoặc hủy) Settlement — giải phóng các khoản doanh thu, KHÔNG ghi tiền vào Wallet.
     */
    @Transactional
    public SettlementResponse rejectSettlement(Long settlementId, RejectSettlementRequest request, Long adminId) {
        Settlement settlement = settlementRepository.findByIdForUpdate(settlementId)
                .orElseThrow(() -> new AppException(ErrorCode.SETTLEMENT_NOT_FOUND));

        if (settlement.getStatus().isApproved()) {
            throw new AppException(ErrorCode.SETTLEMENT_ALREADY_APPROVED,
                    "Đợt tất toán đã được duyệt — lịch sử tài chính không được sửa. "
                            + "Hãy dùng khoản điều chỉnh tài chính.");
        }
        if (!settlement.getStatus().isOpen()) {
            throw new AppException(ErrorCode.SETTLEMENT_INVALID_STATUS,
                    "Trạng thái đợt tất toán không cho phép từ chối: " + settlement.getStatus());
        }

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        settlement.reject(admin, request.reason());
        settlementRepository.save(settlement);

        releaseRevenues(settlementId);

        log.info("[Settlement] Đã từ chối settlement {} — giải phóng các khoản doanh thu",
                settlement.getSettlementCode());

        return SettlementResponse.fromEntity(settlement);
    }

    /**
     * Giải phóng các khoản doanh thu bị giữ trong Settlement — đánh giá lại và chuyển về
     * {@code ELIGIBLE} hoặc {@code PENDING}.
     */
    private void releaseRevenues(Long settlementId) {
        for (PartnerRevenue revenue : revenueRepository.findBySettlementId(settlementId)) {
            PartnerRevenue locked = revenueRepository.findByIdForUpdate(revenue.getId())
                    .orElseThrow(() -> new AppException(ErrorCode.PARTNER_REVENUE_NOT_FOUND));
            if (locked.getStatus() != PartnerRevenueStatus.IN_SETTLEMENT) {
                continue;
            }
            locked.releaseFromSettlement();
            revenueRepository.save(locked);

            // Đánh giá lại điều kiện — nếu không còn đủ thì chuyển về PENDING kèm lý do.
            revenueService.reevaluateForBooking(locked.getBooking().getId());
        }
    }

    // ── Read ──────────────────────────────────────────────────────────────────

    @Transactional(readOnly = true)
    public SettlementResponse getById(Long settlementId) {
        Settlement settlement = settlementRepository.findById(settlementId)
                .orElseThrow(() -> new AppException(ErrorCode.SETTLEMENT_NOT_FOUND));
        return SettlementResponse.fromEntity(settlement);
    }

    @Transactional(readOnly = true)
    public List<SettlementDetailResponse> getDetails(Long settlementId) {
        settlementRepository.findById(settlementId)
                .orElseThrow(() -> new AppException(ErrorCode.SETTLEMENT_NOT_FOUND));

        return detailRepository.findBySettlementIdWithRevenue(settlementId).stream()
                .map(d -> {
                    PartnerRevenue r = d.getPartnerRevenue();
                    return SettlementDetailResponse.builder()
                            .id(d.getId())
                            .settlementId(d.getSettlement().getId())
                            .partnerRevenueId(r.getId())
                            .bookingId(r.getBooking() != null ? r.getBooking().getId() : null)
                            .bookingCode(r.getBooking() != null ? r.getBooking().getBookingCode() : null)
                            .paymentId(r.getPayment() != null ? r.getPayment().getId() : null)
                            .txnRef(r.getPayment() != null ? r.getPayment().getTxnRef() : null)
                            .revenuePeriod(d.getRevenuePeriod())
                            .grossAmount(d.getGrossAmount())
                            .refundAmount(d.getRefundAmount())
                            .commissionRate(r.getCommissionRate())
                            .commissionAmount(d.getCommissionAmount())
                            .adjustmentAmount(d.getAdjustmentAmount())
                            .partnerNetAmount(d.getPartnerNetAmount())
                            .status(r.getStatus())
                            .build();
                })
                .toList();
    }

    @Transactional(readOnly = true)
    public PageResponse<SettlementResponse> getByPartner(Long partnerId, Pageable pageable) {
        Page<Settlement> page = settlementRepository.findByPartner_IdOrderByCreatedAtDesc(partnerId, pageable);
        return PageResponse.from(page, SettlementResponse::fromEntity);
    }

    @Transactional(readOnly = true)
    public PageResponse<SettlementResponse> getAll(SettlementStatus status, Pageable pageable) {
        Page<Settlement> page = (status != null)
                ? settlementRepository.findByStatus(status, pageable)
                : settlementRepository.findAll(pageable);
        return PageResponse.from(page, SettlementResponse::fromEntity);
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Kiểm tra kỳ doanh thu đã kết thúc (Mục 7.1).
     */
    private void validatePeriodClosed(YearMonth period) {
        YearMonth current = YearMonth.now();
        if (!period.isBefore(current) && !financeProperties.isAllowOpenPeriodSettlement()) {
            throw new AppException(ErrorCode.SETTLEMENT_PERIOD_NOT_CLOSED,
                    "Chỉ cho phép tạo đợt tất toán cho kỳ doanh thu đã kết thúc. Kỳ " + period
                            + " chưa kết thúc.");
        }
        // Khoảng trễ (grace) — nếu cấu hình, chỉ cho tạo sau khi kỳ kết thúc + grace.
        if (financeProperties.getSettlementGraceMinutes() > 0) {
            java.time.LocalDateTime earliest = period.plusMonths(1).atDay(1).atStartOfDay()
                    .plusMinutes(financeProperties.getSettlementGraceMinutes());
            if (java.time.LocalDateTime.now().isBefore(earliest)) {
                throw new AppException(ErrorCode.SETTLEMENT_PERIOD_NOT_CLOSED,
                        "Chưa đến thời điểm cho phép tạo đợt tất toán cho kỳ " + period);
            }
        }
    }

    private YearMonth parsePeriod(String period) {
        if (period == null || period.isBlank()) {
            throw new AppException(ErrorCode.VALIDATION_ERROR, "Kỳ doanh thu không được để trống");
        }
        try {
            return YearMonth.parse(period.trim());
        } catch (Exception e) {
            throw new AppException(ErrorCode.VALIDATION_ERROR,
                    "Kỳ doanh thu không hợp lệ (kỳ vòng dương lịch yyyy-MM): " + period);
        }
    }

    private static BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private String generateSettlementCode() {
        return "ST" + UUID.randomUUID().toString().replace("-", "").substring(0, 18).toUpperCase();
    }
}
