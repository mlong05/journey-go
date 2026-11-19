package com.journeygo.modules.settlement.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.finance.config.FinanceProperties;
import com.journeygo.modules.notification.entity.enums.NotificationType;
import com.journeygo.modules.notification.service.NotificationPublisher;
import com.journeygo.modules.providerprofile.entity.ProviderProfile;
import com.journeygo.modules.providerprofile.repository.ProviderProfileRepository;
import com.journeygo.modules.providerrevenue.dto.response.EligibilityEvaluationResponse;
import com.journeygo.modules.providerrevenue.dto.response.ProviderRevenueResponse;
import com.journeygo.modules.providerrevenue.entity.ProviderRevenue;
import com.journeygo.modules.providerrevenue.entity.enums.ProviderRevenueStatus;
import com.journeygo.modules.providerrevenue.repository.ProviderRevenueRepository;
import com.journeygo.modules.providerrevenue.service.ProviderRevenueService;
import com.journeygo.modules.settlement.dto.request.CreateBatchSettlementRequest;
import com.journeygo.modules.settlement.dto.response.BatchSettlementCandidatesResponse;
import com.journeygo.modules.settlement.dto.response.SettlementResponse;
import com.journeygo.modules.settlement.entity.Settlement;
import com.journeygo.modules.settlement.entity.SettlementDetail;
import com.journeygo.modules.settlement.entity.enums.SettlementScope;
import com.journeygo.modules.settlement.entity.enums.SettlementStatus;
import com.journeygo.modules.settlement.repository.SettlementDetailRepository;
import com.journeygo.modules.settlement.repository.SettlementRepository;
import com.journeygo.modules.user.entity.Role;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import com.journeygo.modules.wallet.entity.Wallet;
import com.journeygo.modules.wallet.repository.WalletRepository;
import com.journeygo.modules.wallet.service.WalletService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
 * Đợt tất toán TỔNG cho cả sàn — gom doanh thu của TOÀN BỘ đối tác trong một kỳ.
 *
 * <p><b>Vì sao cần?</b>
 * Khi sàn có nhiều đối tác, cách cũ (mỗi đối tác một đợt) bắt Admin phải lập + duyệt hàng
 * chục đợt riêng lẻ cho cùng một kỳ ⇒ rất chậm và dễ sót đối tác. Đợt TỔNG gom tất cả vào
 * MỘT đợt — Admin duyệt một lần là xong.
 *
 * <p><b>Nguyên tắc bất biến (giữ nguyên logic lọc hiện tại):</b>
 * <ul>
 *   <li>Chỉ khoản <b>đủ điều kiện</b> mới vào đợt — đánh giá lại 9 điều kiện tại thời điểm gọi,
 *       y hệt luồng của một đối tác.</li>
 *   <li>Khoản <b>bị giữ lại</b> (chưa đủ điều kiện) KHÔNG vào đợt — vẫn nằm trong danh sách
 *       riêng kèm lý do, được xét lại ở kỳ sau.</li>
 *   <li>Kỳ đóng + doanh thu chuyển tiếp từ kỳ trước — giữ nguyên cơ chế hiện có.</li>
 * </ul>
 *
 * <p><b>Duyệt đợt tổng:</b> tiền được cộng vào ví của TỪNG đối tác theo đúng số tiền của họ
 * (mỗi đối tác một giao dịch cộng tiền) — tất cả trong CÙNG một transaction.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class BatchSettlementService {

    private final SettlementRepository settlementRepository;
    private final SettlementDetailRepository detailRepository;
    private final ProviderRevenueRepository revenueRepository;
    private final ProviderProfileRepository providerProfileRepository;
    private final WalletRepository walletRepository;
    private final UserRepository userRepository;
    private final ProviderRevenueService revenueService;
    private final WalletService walletService;
    private final FinanceProperties financeProperties;
    private final NotificationPublisher notifications;

    // ── Ứng viên tất toán tổng ────────────────────────────────────────────────

    /**
     * Xem ứng viên tất toán TỔNG của kỳ — gom mọi đối tác lại.
     *
     * <p>Đánh giá lại điều kiện TẠI THỜI ĐIỂM GỌI (giống hệt luồng một đối tác).
     */
    @Transactional(readOnly = true)
    public BatchSettlementCandidatesResponse getBatchCandidates(String revenuePeriod) {
        YearMonth period = parsePeriod(revenuePeriod);

        List<ProviderRevenue> eligible = new ArrayList<>();
        List<BatchSettlementCandidatesResponse.HeldItem> held = new ArrayList<>();

        BigDecimal gross = BigDecimal.ZERO;
        BigDecimal refund = BigDecimal.ZERO;
        BigDecimal commission = BigDecimal.ZERO;
        BigDecimal adjustment = BigDecimal.ZERO;
        BigDecimal net = BigDecimal.ZERO;
        BigDecimal voucherPlatform = BigDecimal.ZERO;
        BigDecimal voucherPartner = BigDecimal.ZERO;

        // Số đối tác khác nhau có khoản đủ điều kiện — dùng cho "N đối tác".
        java.util.Set<Long> partnerIds = new java.util.LinkedHashSet<>();

        for (ProviderRevenue revenue : collectCandidates(revenuePeriod)) {
            if (revenue.getStatus() == ProviderRevenueStatus.SETTLED
                    || revenue.getStatus() == ProviderRevenueStatus.IN_SETTLEMENT) {
                // Đã thuộc đợt khác — không đưa vào ứng viên.
                continue;
            }

            EligibilityEvaluationResponse evaluation = revenueService.evaluateEligibility(revenue.getId());

            if (evaluation.eligible()) {
                eligible.add(revenue);
                if (revenue.getProviderProfile() != null) {
                    partnerIds.add(revenue.getProviderProfile().getId());
                }
                gross = gross.add(nz(revenue.getGrossAmount()));
                refund = refund.add(nz(revenue.getRefundAmount()));
                commission = commission.add(nz(revenue.getCommissionAmount()));
                adjustment = adjustment.add(nz(revenue.getAdjustmentAmount()));
                net = net.add(nz(revenue.getProviderNetAmount()));

                // Voucher — tách theo bên CHỊU (nền tảng / đối tác) để Admin thấy rõ
                // phần giảm giá do mỗi bên gánh.
                BigDecimal voucherDiscount = nz(revenue.getVoucherDiscount());
                if (voucherDiscount.compareTo(BigDecimal.ZERO) > 0) {
                    if (revenue.getVoucherScope()
                            == com.journeygo.modules.voucher.entity.enums.VoucherScope.PARTNER) {
                        voucherPartner = voucherPartner.add(voucherDiscount);
                    } else {
                        voucherPlatform = voucherPlatform.add(voucherDiscount);
                    }
                }
            } else {
                held.add(BatchSettlementCandidatesResponse.HeldItem.builder()
                        .revenueId(revenue.getId())
                        .providerProfileId(revenue.getProviderProfile() != null
                                ? revenue.getProviderProfile().getId() : null)
                        .providerName(revenue.getProviderProfile() != null
                                ? revenue.getProviderProfile().getProviderName() : null)
                        .bookingId(revenue.getBooking() != null ? revenue.getBooking().getId() : null)
                        .bookingCode(revenue.getBooking() != null ? revenue.getBooking().getBookingCode() : null)
                        .revenuePeriod(revenue.getRevenuePeriod())
                        .providerNetAmount(revenue.getProviderNetAmount())
                        .deferredReason(evaluation.deferredReason())
                        .build());
            }
        }

        log.info("[Settlement] Ứng viên tất toán TỔNG kỳ={}: {} khoản đủ điều kiện của {} đối tác, {} khoản giữ lại",
                revenuePeriod, eligible.size(), partnerIds.size(), held.size());

        // Đợt tổng ĐANG CHỜ DUYỆT của kỳ này (nếu có) — khi đợt này tồn tại, các khoản
        // doanh thu đã chuyển sang IN_SETTLEMENT nên `eligible` sẽ rỗng ⇒ UI cần
        // thông báo này để giải thích cho Admin.
        BatchSettlementCandidatesResponse.OpenSettlement openSettlement = null;
        Settlement existingBatch = settlementRepository
                .findFirstByScopeAndRevenuePeriod(SettlementScope.BATCH, revenuePeriod)
                .orElse(null);
        if (existingBatch != null && existingBatch.getStatus().isOpen()) {
            openSettlement = BatchSettlementCandidatesResponse.OpenSettlement.builder()
                    .id(existingBatch.getId())
                    .settlementCode(existingBatch.getSettlementCode())
                    .status(existingBatch.getStatus())
                .settlementAmount(existingBatch.getSettlementAmount())
                .grossAmount(existingBatch.getGrossAmount())
                .detailCount(detailRepository.findBySettlementIdWithRevenue(existingBatch.getId()).size())
                    .createdAt(existingBatch.getCreatedAt())
                    .build();
        }

        return BatchSettlementCandidatesResponse.builder()
                .revenuePeriod(revenuePeriod)
                .eligible(eligible.stream().map(ProviderRevenueResponse::fromEntity).toList())
                .held(held)
                .totals(BatchSettlementCandidatesResponse.Totals.builder()
                        .grossAmount(gross)
                        .refundAmount(refund)
                        .commissionAmount(commission)
                        .adjustmentAmount(adjustment)
                        .settlementAmount(net)
                        .voucherPlatformAmount(voucherPlatform)
                        .voucherPartnerAmount(voucherPartner)
                        .build())
                .partnerCount(partnerIds.size())
                .openSettlement(openSettlement)
                .build();
    }

    // ── Tạo bản nháp ───────────────────────────────────────────────────────────

    /**
     * Tạo bản nháp đợt tất toán TỔNG cho kỳ — gom mọi khoản đủ điều kiện của mọi đối tác.
     */
    @Transactional
    public SettlementResponse createBatchSettlement(CreateBatchSettlementRequest request, Long adminId) {
        YearMonth period = parsePeriod(request.revenuePeriod());
        validatePeriodClosed(period);

        // Chỉ MỘT đợt tổng cho mỗi kỳ — chặn tạo trùng.
        Settlement existingBatch = settlementRepository
                .findFirstByScopeAndRevenuePeriod(SettlementScope.BATCH, request.revenuePeriod())
                .orElse(null);
        if (existingBatch != null && existingBatch.getStatus().isOpen()) {
            throw new AppException(ErrorCode.SETTLEMENT_ALREADY_EXISTS,
                    "Đã có đợt tất toán tổng đang chờ xử lý cho kỳ doanh thu " + request.revenuePeriod()
                            + " (mã " + existingBatch.getSettlementCode() + ")");
        }

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        BatchSettlementCandidatesResponse candidates = getBatchCandidates(request.revenuePeriod());
        if (candidates.eligible() == null || candidates.eligible().isEmpty()) {
            throw new AppException(ErrorCode.SETTLEMENT_NO_ELIGIBLE_REVENUE,
                    "Không có khoản doanh thu nào đủ điều kiện để tất toán cho kỳ " + request.revenuePeriod());
        }

        Settlement settlement = Settlement.builder()
                .settlementCode(generateSettlementCode())
                .scope(SettlementScope.BATCH)
                // providerProfile = NULL ⇒ đợt tổng cho cả sàn.
                .revenuePeriod(request.revenuePeriod())
                .periodStart(period.atDay(1))
                .periodEnd(period.atEndOfMonth())
                .status(SettlementStatus.DRAFT)
                .createdBy(admin)
                .note(request.note())
                .partnerCount(candidates.partnerCount())
                .build();

        Settlement saved = settlementRepository.save(settlement);

        BigDecimal gross = BigDecimal.ZERO;
        BigDecimal refund = BigDecimal.ZERO;
        BigDecimal commission = BigDecimal.ZERO;
        BigDecimal adjustment = BigDecimal.ZERO;
        BigDecimal net = BigDecimal.ZERO;

        for (ProviderRevenueResponse candidate : candidates.eligible()) {
            ProviderRevenue revenue = revenueRepository.findByIdForUpdate(candidate.id())
                    .orElseThrow(() -> new AppException(ErrorCode.PROVIDER_REVENUE_NOT_FOUND));

            // Chống chọn trùng — khoản doanh thu đã thuộc đợt khác.
            if (revenue.getSettlementId() != null
                    || revenue.getStatus() == ProviderRevenueStatus.IN_SETTLEMENT
                    || revenue.getStatus() == ProviderRevenueStatus.SETTLED) {
                continue;
            }

            // Khoản đang PENDING (ví dụ vì "kỳ doanh thu chưa kết thúc") nhưng ĐÃ đủ điều
            // kiện khi đánh giá lại lúc này ⇒ chuyển sang ELIGIBLE trước khi gắn vào đợt.
            if (revenue.getStatus() != ProviderRevenueStatus.ELIGIBLE) {
                revenue.markEligible();
            }

            revenue.markInSettlement(saved.getId());
            revenueRepository.save(revenue);

            detailRepository.save(SettlementDetail.builder()
                    .settlement(saved)
                    .providerRevenue(revenue)
                    // ⚠️ BẮT BUỘC với đợt tổng — biết đối tác của mỗi khoản để cộng
                    // tiền vào đúng ví khi duyệt.
                    .providerProfile(revenue.getProviderProfile())
                    .revenuePeriod(revenue.getRevenuePeriod())
                    .grossAmount(nz(revenue.getGrossAmount()))
                    .refundAmount(nz(revenue.getRefundAmount()))
                    .commissionAmount(nz(revenue.getCommissionAmount()))
                    .adjustmentAmount(nz(revenue.getAdjustmentAmount()))
                    .providerNetAmount(nz(revenue.getProviderNetAmount()))
                    .build());

            gross = gross.add(nz(revenue.getGrossAmount()));
            refund = refund.add(nz(revenue.getRefundAmount()));
            commission = commission.add(nz(revenue.getCommissionAmount()));
            adjustment = adjustment.add(nz(revenue.getAdjustmentAmount()));
            net = net.add(nz(revenue.getProviderNetAmount()));
        }

        saved.setGrossAmount(gross);
        saved.setRefundAmount(refund);
        saved.setCommissionAmount(commission);
        saved.setAdjustmentAmount(adjustment);
        saved.setSettlementAmount(net);
        settlementRepository.save(saved);

        log.info("[Settlement] Đã tạo bản nháp settlement TỔNG {} kỳ {} — {} đối tác, tổng {}",
                saved.getSettlementCode(), request.revenuePeriod(), candidates.partnerCount(), net);

        return SettlementResponse.fromEntity(saved);
    }

    // ── Duyệt đợt tổng ─────────────────────────────────────────────────────────

    /**
     * Duyệt đợt tất toán TỔNG — cộng tiền vào ví của TỪNG đối tác theo số tiền của họ.
     *
     * <p>Toàn bộ nằm trong MỘT transaction ⇒ lỗi một đối tác ⇒ rollback cả đợt.
     */
    @Transactional
    public SettlementResponse approveBatchSettlement(Long settlementId, Long adminId) {
        Settlement settlement = settlementRepository.findByIdForUpdate(settlementId)
                .orElseThrow(() -> new AppException(ErrorCode.SETTLEMENT_NOT_FOUND));

        if (settlement.getScope() != SettlementScope.BATCH) {
            throw new AppException(ErrorCode.SETTLEMENT_INVALID_STATUS,
                    "Đợt tất toán này không phải đợt tổng — dùng luồng duyệt thông thường");
        }
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

        // ── Gom khoản doanh thu trong đợt ─────────────────────────────────────
        List<ProviderRevenue> details = new ArrayList<>();
        Map<Long, ProviderRevenue> merged = new LinkedHashMap<>();
        for (SettlementDetail d : detailRepository.findBySettlementIdWithRevenue(settlementId)) {
            ProviderRevenue r = d.getProviderRevenue();
            if (r != null) {
                merged.put(r.getId(), r);
            }
        }
        for (ProviderRevenue r : revenueRepository.findBySettlementId(settlementId)) {
            merged.putIfAbsent(r.getId(), r);
        }
        details.addAll(merged.values());

        if (details.isEmpty()) {
            throw new AppException(ErrorCode.SETTLEMENT_NO_ELIGIBLE_REVENUE,
                    "Đợt tất toán không có khoản doanh thu nào");
        }

        // ── Đánh giá lại & gom theo đối tác ───────────────────────────────────
        // Mỗi đối tác ⇒ 1 giao dịch cộng tiền (đúng như đợt riêng lẻ của họ).
        Map<Long, PartnerAmount> byPartner = new LinkedHashMap<>();

        BigDecimal recomputedGross = BigDecimal.ZERO;
        BigDecimal recomputedRefund = BigDecimal.ZERO;
        BigDecimal recomputedCommission = BigDecimal.ZERO;
        BigDecimal recomputedAdjustment = BigDecimal.ZERO;
        BigDecimal recomputedNet = BigDecimal.ZERO;

        for (ProviderRevenue revenue : details) {
            ProviderRevenue locked = revenueRepository.findByIdForUpdate(revenue.getId())
                    .orElseThrow(() -> new AppException(ErrorCode.PROVIDER_REVENUE_NOT_FOUND));

            // Tự vá liên kết bị lệch (dữ liệu mẫu được seed lại).
            if (locked.getSettlementId() == null
                    && locked.getStatus() != ProviderRevenueStatus.SETTLED) {
                locked.markInSettlement(settlementId);
                revenueRepository.save(locked);
            }

            if (locked.getStatus() != ProviderRevenueStatus.IN_SETTLEMENT
                    || !settlementId.equals(locked.getSettlementId())) {
                throw new AppException(ErrorCode.SETTLEMENT_ELIGIBILITY_CHANGED,
                        "Khoản doanh thu " + locked.getId()
                                + " không còn thuộc đợt tất toán này — vui lòng cập nhật lại đợt tất toán");
            }

            // Tính lại số tiền (refund / hoa hồng / điều chỉnh).
            revenueService.reevaluateForBooking(locked.getBooking().getId());
            revenueRepository.flush();

            EligibilityEvaluationResponse evaluation =
                    revenueService.evaluateForApproval(locked.getId(), settlementId);
            if (!evaluation.eligible()) {
                throw new AppException(ErrorCode.SETTLEMENT_ELIGIBILITY_CHANGED,
                        "Khoản doanh thu " + locked.getId() + " không còn đủ điều kiện tất toán: "
                                + evaluation.deferredReason());
            }

            recomputedGross = recomputedGross.add(nz(locked.getGrossAmount()));
            recomputedRefund = recomputedRefund.add(nz(locked.getRefundAmount()));
            recomputedCommission = recomputedCommission.add(nz(locked.getCommissionAmount()));
            recomputedAdjustment = recomputedAdjustment.add(nz(locked.getAdjustmentAmount()));
            recomputedNet = recomputedNet.add(nz(locked.getProviderNetAmount()));

            ProviderProfile partner = locked.getProviderProfile();
            if (partner == null) {
                throw new AppException(ErrorCode.SETTLEMENT_ELIGIBILITY_CHANGED,
                        "Khoản doanh thu " + locked.getId() + " không xác định được đối tác");
            }
            byPartner.computeIfAbsent(partner.getId(), k -> new PartnerAmount(partner))
                    .add(nz(locked.getProviderNetAmount()));
        }

        if (settlement.getSettlementAmount() != null
                && settlement.getSettlementAmount().compareTo(recomputedNet) != 0) {
            throw new AppException(ErrorCode.SETTLEMENT_ELIGIBILITY_CHANGED,
                    "Số tiền đợt tất toán đã thay đổi (bản nháp: " + settlement.getSettlementAmount()
                            + ", tính lại: " + recomputedNet + ") — vui lòng cập nhật lại đợt tất toán");
        }

        // ── Ghi nhận tài chính: cộng tiền vào ví từng đối tác ─────────────────
        settlement.approve(admin);
        settlement.setGrossAmount(recomputedGross);
        settlement.setRefundAmount(recomputedRefund);
        settlement.setCommissionAmount(recomputedCommission);
        settlement.setAdjustmentAmount(recomputedAdjustment);
        settlement.setSettlementAmount(recomputedNet);
        settlement.setPartnerCount(byPartner.size());
        settlementRepository.save(settlement);

        for (PartnerAmount entry : byPartner.values()) {
            if (entry.amount.compareTo(BigDecimal.ZERO) <= 0) {
                // Không có tiền để trả cho đối tác này ⇒ bỏ qua (không tạo giao dịch 0đ).
                continue;
            }
            Wallet wallet = walletRepository.findByProviderProfileIdForUpdate(entry.partner.getId())
                    .orElseThrow(() -> new AppException(ErrorCode.WALLET_NOT_FOUND,
                            "Đối tác " + entry.partner.getProviderName()
                                    + " chưa có ví nội bộ — không thể tất toán"));
            walletService.creditFromSettlement(
                    wallet,
                    entry.amount,
                    settlement.getId(),
                    admin,
                    "Cộng tiền từ đợt tất toán tổng " + settlement.getSettlementCode()
                            + " (kỳ doanh thu " + settlement.getRevenuePeriod() + ")");
        }

        // Chuyển các khoản doanh thu sang SETTLED.
        for (ProviderRevenue revenue : details) {
            ProviderRevenue locked = revenueRepository.findByIdForUpdate(revenue.getId())
                    .orElseThrow(() -> new AppException(ErrorCode.PROVIDER_REVENUE_NOT_FOUND));
            locked.markSettled();
            revenueRepository.save(locked);
        }

        log.info("[Settlement] Đã duyệt settlement TỔNG {} — {} đối tác, tổng {}",
                settlement.getSettlementCode(), byPartner.size(), recomputedNet);

        // Thông báo cho từng đối tác nhận tiền.
        for (PartnerAmount entry : byPartner.values()) {
            if (entry.amount.compareTo(BigDecimal.ZERO) <= 0) {
                continue;
            }
            notifications.send(NotificationType.SETTLEMENT_APPROVED)
                    .to(NotificationPublisher.idOf(entry.partner.getUser()))
                    .title("Đối soát doanh thu đã được duyệt")
                    .body(NotificationPublisher.money(entry.amount) + " của kỳ " + settlement.getRevenuePeriod()
                            + " (đợt " + settlement.getSettlementCode() + ") đã được cộng vào ví của bạn.")
                    .link("/provider")
                    .ref("SETTLEMENT", settlement.getId())
                    .queue(NotificationPublisher.Queue.SETTLEMENTS)
                    .publish();
        }
        notifications.queueChanged(Role.ADMIN, NotificationPublisher.Queue.SETTLEMENTS);

        return SettlementResponse.fromEntity(settlement);
    }

    // ── Helpers ────────────────────────────────────────────────────────────────

    /**
     * Gom mọi khoản doanh thu CẦN XÉT cho kỳ — của TẤT CẢ đối tác.
     *
     * <p>Gồm 2 nguồn (giữ nguyên cơ chế của luồng một đối tác):
     * <ul>
     *   <li>Khoản thuộc đúng kỳ đang lập đợt.</li>
     *   <li>Khoản CHƯA được tất toán từ KỲ TRƯỚC (doanh thu chuyển tiếp) — kỳ quá khứ
     *       mới được mang sang; kỳ tương lai không phải chuyển tiếp mà là doanh thu chưa tới hạn.</li>
     * </ul>
     */
    private List<ProviderRevenue> collectCandidates(String revenuePeriod) {
        List<ProviderRevenue> combined = new ArrayList<>();

        // Khoản thuộc đúng kỳ — mọi đối tác.
        combined.addAll(revenueRepository.findByRevenuePeriod(revenuePeriod));

        // Doanh thu chuyển tiếp — khoản chưa tất toán của kỳ TRƯỚC.
        for (ProviderRevenue revenue : revenueRepository.findUnsettledByAllProviders()) {
            if (revenuePeriod.equals(revenue.getRevenuePeriod())) {
                continue;
            }
            if (isPeriodBefore(revenue.getRevenuePeriod(), revenuePeriod)) {
                combined.add(revenue);
            }
        }

        return combined;
    }

    /**
     * Ghi nhận số tiền của MỘT đối tác trong đợt tổng.
     */
    private static final class PartnerAmount {
        private final ProviderProfile partner;
        private BigDecimal amount = BigDecimal.ZERO;

        private PartnerAmount(ProviderProfile partner) {
            this.partner = partner;
        }

        private void add(BigDecimal value) {
            this.amount = this.amount.add(value);
        }
    }

    /**
     * Kỳ doanh thu {@code candidate} có nằm TRƯỚC kỳ {@code reference} hay không.
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
