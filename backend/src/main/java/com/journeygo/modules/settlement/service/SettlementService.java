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
import com.journeygo.modules.settlement.dto.response.PlatformRevenueSummaryResponse;
import com.journeygo.modules.settlement.dto.response.SettlementCandidatesResponse;
import com.journeygo.modules.settlement.dto.response.SettlementDetailResponse;
import com.journeygo.modules.settlement.dto.response.SettlementResponse;
import com.journeygo.modules.settlement.entity.Settlement;
import com.journeygo.modules.settlement.entity.SettlementDetail;
import com.journeygo.modules.settlement.entity.enums.SettlementStatus;
import com.journeygo.modules.settlement.repository.ApprovedSettlementAggregate;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
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

        // Ngoài ra: các khoản CHƯA được tất toán từ KỲ TRƯỚC — doanh thu chuyển tiếp.
        //
        // CHỈ lấy khoản có kỳ doanh thu TRƯỚC kỳ đang lập đợt. Khoản thuộc kỳ TƯƠNG LAI
        // (kỳ chưa kết thúc) không phải "doanh thu chuyển tiếp" mà là doanh thu chưa tới hạn —
        // không được trả tiền trước khi kỳ đó kết thúc.
        //
        // Dùng `findUnsettledByPartner` (không chỉ ELIGIBLE) vì khoản bị giữ ở trạng thái
        // PENDING vì lý do "kỳ doanh thu chưa kết thúc" sẽ tự đủ điều kiện khi kỳ đóng lại
        // — nếu chỉ lấy ELIGIBLE thì khoản đó bị bỏ sót vĩnh viễn.
        List<PartnerRevenue> carried = revenueRepository.findUnsettledByPartner(partnerId).stream()
                .filter(r -> !revenuePeriod.equals(r.getRevenuePeriod()))
                .filter(r -> isPeriodBefore(r.getRevenuePeriod(), revenuePeriod))
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
                        .bookingCode(revenue.getBooking() != null ? revenue.getBooking().getBookingCode() : null)
                        .revenuePeriod(revenue.getRevenuePeriod())
                        .partnerNetAmount(revenue.getPartnerNetAmount())
                        .deferredReason(evaluation.deferredReason())
                        .build());
            }
        }

        log.info("[Settlement] Ứng viên tất toán partner={} kỳ={}: {} khoản đủ điều kiện, {} khoản giữ lại",
                partner.getId(), revenuePeriod, eligible.size(), held.size());

        // Đợt tất toán đang chờ duyệt của cùng đối tác + kỳ (nếu có).
        // Khi đợt này tồn tại, các khoản doanh thu đã chuyển sang IN_SETTLEMENT
        // nên `eligible` sẽ rỗng — trả về thông tin này để UI giải thích cho Admin.
        SettlementCandidatesResponse.OpenSettlement openSettlement = null;
        for (Settlement existing : settlementRepository.findByPartnerAndPeriod(partner.getId(), revenuePeriod)) {
            if (!existing.getStatus().isOpen()) {
                continue;
            }
            openSettlement = SettlementCandidatesResponse.OpenSettlement.builder()
                    .id(existing.getId())
                    .settlementCode(existing.getSettlementCode())
                    .status(existing.getStatus())
                    .settlementAmount(existing.getSettlementAmount())
                    .detailCount(detailRepository.findBySettlementIdWithRevenue(existing.getId()).size())
                    .createdAt(existing.getCreatedAt())
                    .build();
            break;
        }

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
                .openSettlement(openSettlement)
                .build();
    }

    // ── Doanh thu nền tảng ───────────────────────────────────────────────────

    /**
     * Tổng hợp DOANH THU NỀN TẢNG — phần tiền nền tảng thu được sau khi tất toán cho đối tác.
     *
     * <p>Công thức cho mỗi đợt tất toán đã duyệt:
     * <pre>
     * Doanh thu nền tảng = Tổng thanh toán − Tổng hoàn tiền − Tổng chi trả đối tác
     *                    = Hoa hồng + Điều chỉnh
     * </pre>
     *
     * <p>Chỉ tính các đợt đã DUYỆT ({@code APPROVED}) — đó là lúc tiền thực sự được
     * ghi vào ví đối tác. Kỳ đang chờ duyệt chưa phải doanh thu đã thu được.
     *
     * @param maxPeriods số kỳ tối đa trả về (mới nhất trước)
     */
    @Transactional(readOnly = true)
    public PlatformRevenueSummaryResponse getPlatformRevenueSummary(int maxPeriods) {
        List<ApprovedSettlementAggregate> rows = settlementRepository.aggregateApprovedByPeriod();

        BigDecimal totalGross = BigDecimal.ZERO;
        BigDecimal totalRefund = BigDecimal.ZERO;
        BigDecimal totalCommission = BigDecimal.ZERO;
        BigDecimal totalAdjustment = BigDecimal.ZERO;
        BigDecimal totalPartnerNet = BigDecimal.ZERO;
        BigDecimal totalPlatform = BigDecimal.ZERO;
        long totalCount = 0;

        List<PlatformRevenueSummaryResponse.PeriodRevenue> periods = new ArrayList<>();

        for (ApprovedSettlementAggregate row : rows) {
            String period = row.getRevenuePeriod();
            BigDecimal gross = nz(row.getGrossAmount());
            BigDecimal refund = nz(row.getRefundAmount());
            BigDecimal commission = nz(row.getCommissionAmount());
            BigDecimal adjustment = nz(row.getAdjustmentAmount());
            BigDecimal partnerNet = nz(row.getSettlementAmount());
            long count = row.getSettlementCount() != null ? row.getSettlementCount() : 0L;

            // Doanh thu nền tảng = hoa hồng + điều chỉnh (tương đương gross − refund − net).
            BigDecimal platform = commission.add(adjustment);

            totalGross = totalGross.add(gross);
            totalRefund = totalRefund.add(refund);
            totalCommission = totalCommission.add(commission);
            totalAdjustment = totalAdjustment.add(adjustment);
            totalPartnerNet = totalPartnerNet.add(partnerNet);
            totalPlatform = totalPlatform.add(platform);
            totalCount += count;

            periods.add(PlatformRevenueSummaryResponse.PeriodRevenue.builder()
                    .revenuePeriod(period)
                    .grossAmount(gross)
                    .refundAmount(refund)
                    .commissionAmount(commission)
                    .adjustmentAmount(adjustment)
                    .partnerNetAmount(partnerNet)
                    .platformRevenue(platform)
                    .settlementCount(count)
                    .build());
        }

        // Giới hạn số kỳ trả về (mới nhất trước) — tránh payload toàn lịch sử.
        if (maxPeriods > 0 && periods.size() > maxPeriods) {
            periods = periods.subList(0, maxPeriods);
        }

        return PlatformRevenueSummaryResponse.builder()
                .totalPlatformRevenue(totalPlatform)
                .totalGrossAmount(totalGross)
                .totalRefundAmount(totalRefund)
                .totalPartnerNetAmount(totalPartnerNet)
                .totalCommissionAmount(totalCommission)
                .totalAdjustmentAmount(totalAdjustment)
                .approvedSettlementCount(totalCount)
                .periods(List.copyOf(periods))
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
            if (revenue.getSettlementId() != null
                    || revenue.getStatus() == PartnerRevenueStatus.IN_SETTLEMENT
                    || revenue.getStatus() == PartnerRevenueStatus.SETTLED) {
                continue;
            }

            // Khoản doanh thu có thể đang ở trạng thái PENDING (ví dụ bị giữ vì lý do
            // "kỳ doanh thu chưa kết thúc") nhưng ĐÃ đủ điều kiện khi đánh giá lại tại
            // thời điểm gọi. Chuyển sang ELIGIBLE trước khi gắn vào đợt — nếu không,
            // điều kiện chặn ở trên sẽ bỏ sót khoản này và tổng tiền đợt lệch với
            // tổng hiển thị ở danh sách ứng viên.
            if (revenue.getStatus() != PartnerRevenueStatus.ELIGIBLE) {
                revenue.markEligible();
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
        // Lấy khoản doanh thu qua SettlementDetail (bảng chi tiết của đợt tất toán)
        // thay vì tra theo `partner_revenue.settlement_id`.
        //
        // LÝ DO: `partner_revenue.settlement_id` là cột denormalized do code khác
        // ghi và có thể bị lệch (đặc biệt khi dữ liệu mẫu được seed lại mỗi lần
        // khởi động server). SettlementDetail mới là bảng ghi ĐỐI CHIẾU chuẩn —
        // nó được tạo đúng một lần khi lập bản nháp và không bị ghi đè.
        // Tra cả hai nguồn rồi hợp nhất để không bỏ sót khoản nào.
        List<PartnerRevenue> details = new ArrayList<>();
        Map<Long, PartnerRevenue> merged = new LinkedHashMap<>();

        for (SettlementDetail d : detailRepository.findBySettlementIdWithRevenue(settlementId)) {
            PartnerRevenue r = d.getPartnerRevenue();
            if (r != null) {
                merged.put(r.getId(), r);
            }
        }
        // Bổ sung các khoản doanh thu vẫn còn trỏ `settlement_id` (đường dẫn cũ).
        for (PartnerRevenue r : revenueRepository.findBySettlementId(settlementId)) {
            merged.putIfAbsent(r.getId(), r);
        }
        details.addAll(merged.values());

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

            // Tự vá liên kết bị lệch: khoản doanh thu có mặt trong SettlementDetail
            // của đợt này nhưng cột `settlement_id` lại trỏ null (do dữ liệu mẫu được
            // seed lại mỗi lần khởi động server). Gắn lại liên kết thay vì báo lỗi.
            if (locked.getSettlementId() == null
                    && locked.getStatus() != PartnerRevenueStatus.SETTLED) {
                locked.markInSettlement(settlementId);
                revenueRepository.save(locked);
            }

            if (locked.getStatus() != PartnerRevenueStatus.IN_SETTLEMENT
                    || !settlementId.equals(locked.getSettlementId())) {
                throw new AppException(ErrorCode.SETTLEMENT_ELIGIBILITY_CHANGED,
                        "Khoản doanh thu " + locked.getId()
                                + " không còn thuộc đợt tất toán này — vui lòng cập nhật lại đợt tất toán");
            }

            // Tính lại từ dữ liệu hiện tại (refund, hoa hồng, điều chỉnh).
            revenueService.reevaluateForBooking(locked.getBooking().getId());
            revenueRepository.flush();

            // Đánh giá theo ngữ cảnh DUYỆT: khoản doanh thu đang ở IN_SETTLEMENT và
            // trỏ đúng đợt này nên điều kiện 6 được chấm theo nghĩa "thuộc đúng đợt
            // đang duyệt" (nếu dùng chế độ ứng viên thì điều kiện này luôn fail).
            EligibilityEvaluationResponse evaluation =
                    revenueService.evaluateForApproval(locked.getId(), settlementId);
            if (!evaluation.eligible()) {
                throw new AppException(ErrorCode.SETTLEMENT_ELIGIBILITY_CHANGED,
                        buildEligibilityErrorMessage(locked, evaluation));
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
     * Dựng thông báo lỗi chi tiết khi một khoản doanh thu không còn đủ điều kiện tất toán.
     *
     * <p>Liệt kê rõ những điều kiện KHÔNG đạt kèm chi tiết, để Admin biết chính xác cần
     * xử lý gì thay vì chỉ nhận một mã lý do chung chung.
     */
    private String buildEligibilityErrorMessage(PartnerRevenue revenue,
                                                 EligibilityEvaluationResponse evaluation) {
        String bookingId = revenue.getBooking() != null
                ? String.valueOf(revenue.getBooking().getId())
                : "?";
        StringBuilder sb = new StringBuilder();
        sb.append("Khoản doanh thu (booking ").append(bookingId)
                .append(") không còn đủ điều kiện tất toán: ")
                .append(evaluation.deferredReason()).append(". ");

        List<String> failed = evaluation.checks().stream()
                .filter(c -> !c.passed())
                .map(c -> c.code() + " — " + c.description()
                        + (c.detail() != null && !c.detail().isBlank() ? " (" + c.detail() + ")" : ""))
                .toList();

        if (!failed.isEmpty()) {
            sb.append("Điều kiện chưa đạt: ").append(String.join("; ", failed)).append(". ");
        }
        sb.append("Vui lòng cập nhật lại đợt tất toán trước khi duyệt.");
        return sb.toString();
    }

    /**
     * Giải phóng các khoản doanh thu bị giữ trong Settlement — đánh giá lại và chuyển về
     * {@code ELIGIBLE} hoặc {@code PENDING}.
     */
    private void releaseRevenues(Long settlementId) {
        // Gom từ CẢ HAI nguồn: SettlementDetail (chuẩn) và partner_revenue.settlement_id.
        Map<Long, PartnerRevenue> merged = new LinkedHashMap<>();
        for (SettlementDetail d : detailRepository.findBySettlementIdWithRevenue(settlementId)) {
            PartnerRevenue r = d.getPartnerRevenue();
            if (r != null) {
                merged.put(r.getId(), r);
            }
        }
        for (PartnerRevenue r : revenueRepository.findBySettlementId(settlementId)) {
            merged.putIfAbsent(r.getId(), r);
        }

        for (PartnerRevenue revenue : merged.values()) {
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

    /**
     * Kỳ doanh thu {@code candidate} có nằm TRƯỚC kỳ {@code reference} hay không.
     *
     * <p>Dùng cho cơ chế "doanh thu chuyển tiếp": chỉ những khoản thuộc kỳ quá khứ mới
     * được mang sang đợt tất toán của kỳ hiện tại. Khoản thuộc kỳ tương lai bị loại.
     *
     * @return {@code true} nếu {@code candidate} < {@code reference}; {@code false} nếu
     *         bằng, lớn hơn, hoặc không đọc được chuỗi kỳ.
     */
    private boolean isPeriodBefore(String candidate, String reference) {
        if (candidate == null || candidate.isBlank() || reference == null || reference.isBlank()) {
            return false;
        }
        try {
            return YearMonth.parse(candidate.trim()).isBefore(YearMonth.parse(reference.trim()));
        } catch (Exception e) {
            log.warn("[Settlement] Không đọc được kỳ doanh thu '{}' / '{}' — bỏ qua", candidate, reference);
            return false;
        }
    }

    private static BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private String generateSettlementCode() {
        return "ST" + UUID.randomUUID().toString().replace("-", "").substring(0, 18).toUpperCase();
    }
}
