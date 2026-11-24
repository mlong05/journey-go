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
import com.journeygo.modules.settlement.dto.response.SettlementHeldResponse;
import com.journeygo.modules.settlement.dto.response.SettlementResponse;
import com.journeygo.modules.settlement.entity.Settlement;
import com.journeygo.modules.settlement.entity.SettlementDetail;
import com.journeygo.modules.settlement.entity.SettlementPeriod;
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
 *       riêng kèm lý do, được xét lại ở kỳ của chính nó.</li>
 *   <li><b>Chỉ khoản thuộc ĐÚNG kỳ của đợt</b> — mỗi đợt chỉ gom giao dịch phát sinh
 *       trong chu kỳ 10 ngày tương ứng (VD đợt "Kỳ 2 — 11/11 → 20/11/2026" chỉ gom giao
 *       dịch có ngày hoàn thành trong khoảng 11–20/11/2026).</li>
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
        return collectBatchCandidates(revenuePeriod, false);
    }

    /**
     * Ứng viên tất toán TỔNG — dùng nội bộ (tác vụ nền tự động tạo đợt).
     *
     * <p>Khác {@link #getBatchCandidates(String)} ở chỗ BỎ qua kiểm tra quyền sở hữu
     * dữ liệu tài chính: tác vụ nền chạy ngoài phạm vi HTTP nên không có
     * {@code SecurityContext}. Kết quả vẫn được Admin kiểm tra lại khi duyệt đợt.
     */
    @Transactional(readOnly = true)
    public BatchSettlementCandidatesResponse getBatchCandidatesInternal(String revenuePeriod) {
        return collectBatchCandidates(revenuePeriod, true);
    }

    /**
     * Thu thập ứng viên tất toán tổng của kỳ.
     *
     * @param internal {@code true} ⇒ bỏ qua guard quyền sở hữu (dùng nội bộ / tác vụ nền)
     */
    private BatchSettlementCandidatesResponse collectBatchCandidates(String revenuePeriod,
                                                                    boolean internal) {
        return collectBatchCandidates(revenuePeriod, internal, true);
    }

    /**
     * Thu thập ứng viên tất toán tổng của kỳ.
     *
     * @param internal          {@code true} ⇒ bỏ qua guard quyền sở hữu (nội bộ / tác vụ nền)
     * @param includeCarriedOver có lấy thêm khoản CHƯA ĐỦ ĐIỀU KIỆN của kỳ trước (được
     *                          đẩy sang kỳ này khi đã đủ điều kiện) hay không
     */
    private BatchSettlementCandidatesResponse collectBatchCandidates(String revenuePeriod,
                                                                    boolean internal,
                                                                    boolean includeCarriedOver) {
        SettlementPeriod period = parsePeriod(revenuePeriod);

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

        for (ProviderRevenue revenue : collectCandidates(revenuePeriod, includeCarriedOver)) {
            if (revenue.getStatus() == ProviderRevenueStatus.SETTLED
                    || revenue.getStatus() == ProviderRevenueStatus.IN_SETTLEMENT) {
                // Đã thuộc đợt khác — không đưa vào ứng viên.
                continue;
            }

            EligibilityEvaluationResponse evaluation = internal
                    ? revenueService.evaluateEligibilityInternal(revenue.getId())
                    : revenueService.evaluateEligibility(revenue.getId());

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
                // ⚠️ Danh sách "BỊ GIỮ LẠI" gồm 2 nhóm:
                //
                //  1. Khoản thuộc ĐÚNG kỳ đang xem, chưa đủ điều kiện.
                //  2. Khoản thuộc KỲ TRƯỚC, đã được đẩy sang kỳ này để xét lại
                //     (cơ chế carry-forward) nhưng VẪN chưa đủ điều kiện ⇒ tiếp tục
                //     chờ. Đây chính là "khoản bị đọng" mà Admin cần thấy.
                //
                // ⚠️ KHÔNG được lấy khoản thuộc kỳ VỀ SAU — như vậy mở đợt kỳ 09/2026
                // lại thấy khoản của 11/2026 nằm trong danh sách giữ lại của kỳ 09 ⇒
                // Admin tưởng kỳ 09 đang nợ trong khi thực ra đó là kỳ 11.
                // (Đã chặn ở `collectCandidates` bằng `origin.isBefore(current)`.)
                boolean carriedOver = !revenuePeriod.equals(revenue.getRevenuePeriod());
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
                        .carriedOver(carriedOver)
                        .build());
            }
        }

        log.info("[Settlement] Ứng viên tất toán TỔNG kỳ={}: {} khoản đủ điều kiện của {} đối tác, {} khoản giữ lại",
                revenuePeriod, eligible.size(), partnerIds.size(), held.size());

        // Đợt tổng ĐANG CHỜ DUYỆT của kỳ này (nếu có) — khi đợt này tồn tại, các khoản
        // doanh thu đã chuyển sang IN_SETTLEMENT nên `eligible` sẽ rỗng ⇒ UI cần
        // thông báo này để giải thích cho Admin.
        //
        // ⚠️ Duyệt danh sách (không dùng findFirst) — sau khi từ chối, kỳ có thể có
        // nhiều đợt (đợt cũ REJECTED + đợt mới DRAFT) ⇒ chỉ lấy đợt đang MỞ.
        BatchSettlementCandidatesResponse.OpenSettlement openSettlement = null;
        for (Settlement existingBatch : settlementRepository
                .findByScopeAndRevenuePeriod(SettlementScope.BATCH, revenuePeriod)) {
            if (!existingBatch.getStatus().isOpen()) {
                continue;
            }
            openSettlement = BatchSettlementCandidatesResponse.OpenSettlement.builder()
                    .id(existingBatch.getId())
                    .settlementCode(existingBatch.getSettlementCode())
                    .status(existingBatch.getStatus())
                .settlementAmount(existingBatch.getSettlementAmount())
                .grossAmount(existingBatch.getGrossAmount())
                .detailCount(detailRepository.findBySettlementIdWithRevenue(existingBatch.getId()).size())
                    .createdAt(existingBatch.getCreatedAt())
                    .build();
            break;
        }

        return BatchSettlementCandidatesResponse.builder()
                .revenuePeriod(revenuePeriod)
                .periodLabel(period != null ? period.toDisplayLabel() : revenuePeriod)
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

    // ── Khoản bị giữ lại (chưa đủ điều kiện) ──────────────────────────────────

    /**
     * Xem các khoản doanh thu BỊ GIỮ LẠI của một kỳ — chưa đủ điều kiện nên không
     * vào đợt tất toán.
     *
     * <p><b>Vì sao cần?</b> Khi đợt được TỰ ĐỘNG tạo, Admin mở đợt ra chỉ thấy các khoản
     * ĐỦ ĐIỀU KIỆN (đã vào đợt) ⇒ không thấy được những gì đang bị đọng trong chính kỳ đó.
     * Hàm này bổ sung phần "Bị giữ lại" cho modal chi tiết đợt.
     *
     * <p><b>Vòng đời:</b> khoản chưa đủ điều kiện ở kỳ K sẽ được XÉT LẠI ở kỳ K+1
     * (xem {@link #autoCreateBatchSettlements(int)}) — nếu đủ điều kiện thì vào đợt K+1
     * và được trả tiền; nếu chưa thì giữ lại và tiếp tục chờ kỳ sau.
     *
     * @param revenuePeriod kỳ doanh thu cần xem (VD {@code 2026-10-1})
     */
    @Transactional(readOnly = true)
    public SettlementHeldResponse getHeldItems(String revenuePeriod) {
        SettlementPeriod period = parsePeriod(revenuePeriod);

        List<SettlementHeldResponse.HeldItem> held = new ArrayList<>();
        BigDecimal total = BigDecimal.ZERO;
        java.util.Set<Long> partnerIds = new java.util.LinkedHashSet<>();

        for (ProviderRevenue revenue : collectCandidates(revenuePeriod, true)) {
            // Đã thuộc đợt nào (đang mở / đã duyệt / đã tất toán) ⇒ không còn "bị giữ".
            if (revenue.getSettlementId() != null
                    || revenue.getStatus() == ProviderRevenueStatus.IN_SETTLEMENT
                    || revenue.getStatus() == ProviderRevenueStatus.SETTLED) {
                continue;
            }

            EligibilityEvaluationResponse evaluation = revenueService.evaluateEligibilityInternal(revenue.getId());
            if (evaluation.eligible()) {
                // Đã đủ điều kiện ⇒ không phải "bị giữ" (chỉ xảy ra khi đợt đã bị từ chối
                // nên khoản được giải phóng nhưng chưa kịp vào đợt mới).
                continue;
            }

            if (revenue.getProviderProfile() != null) {
                partnerIds.add(revenue.getProviderProfile().getId());
            }
            total = total.add(nz(revenue.getProviderNetAmount()));

            held.add(SettlementHeldResponse.HeldItem.builder()
                    .revenueId(revenue.getId())
                    .providerProfileId(revenue.getProviderProfile() != null
                            ? revenue.getProviderProfile().getId() : null)
                    .providerName(revenue.getProviderProfile() != null
                            ? revenue.getProviderProfile().getProviderName() : null)
                    .bookingId(revenue.getBooking() != null ? revenue.getBooking().getId() : null)
                    .bookingCode(revenue.getBooking() != null ? revenue.getBooking().getBookingCode() : null)
                    .revenuePeriod(revenue.getRevenuePeriod())
                    .grossAmount(nz(revenue.getGrossAmount()))
                    .providerNetAmount(nz(revenue.getProviderNetAmount()))
                    .deferredReason(evaluation.deferredReason())
                    .failedChecks(evaluation.checks() == null ? List.of() : evaluation.checks().stream()
                            .filter(c -> !c.passed())
                            .map(c -> c.description() + " — " + (c.detail() != null ? c.detail() : ""))
                            .toList())
                    .carriedOver(!revenuePeriod.equals(revenue.getRevenuePeriod()))
                    .build());
        }

        return SettlementHeldResponse.builder()
                .revenuePeriod(revenuePeriod)
                .periodLabel(period != null ? period.toDisplayLabel() : revenuePeriod)
                .held(held)
                .totalAmount(total)
                .partnerCount(partnerIds.size())
                // Kỳ kế tiếp là nơi các khoản này sẽ được xét lại khi kỳ đó đóng.
                .carriedTo(period != null ? period.plusCycles(1).toPeriodString() : null)
                .build();
    }

    // ── Tạo bản nháp ───────────────────────────────────────────────────────────

    /**
     * Tạo bản nháp đợt tất toán TỔNG cho kỳ — gom mọi khoản đủ điều kiện của mọi đối tác.
     */
    @Transactional
    public SettlementResponse createBatchSettlement(CreateBatchSettlementRequest request, Long adminId) {
        SettlementPeriod period = parsePeriod(request.revenuePeriod());
        validatePeriodClosed(period);

        // Chỉ MỘT đợt tổng "còn sống" cho mỗi kỳ — chặn tạo trùng.
        //
        // Đợt đã TỪ CHỐI / HỦY không còn chiếm chỗ ⇒ Admin từ chối xong vẫn tạo lại
        // thủ công cho cùng kỳ được (đúng luồng nghiệp vụ: từ chối → qua tab
        // "Tạo đợt tất toán" → chọn lại kỳ → bấm tạo).
        //
        // ⚠️ Dùng `findByScopeAndRevenuePeriod` (danh sách) chứ không phải
        // `findFirstBy...` — sau khi từ chối, kỳ có THỂ có nhiều đợt (đợt cũ REJECTED
        // + đợt mới DRAFT) ⇒ "findFirst" có thể trả về nhầm đợt cũ và bỏ sót việc
        // chặn trùng.
        boolean hasOpenBatch = settlementRepository
                .findByScopeAndRevenuePeriod(SettlementScope.BATCH, request.revenuePeriod())
                .stream()
                .anyMatch(s -> s.getStatus().isOpen());
        if (hasOpenBatch) {
            throw new AppException(ErrorCode.SETTLEMENT_ALREADY_EXISTS,
                    "Đã có đợt tất toán tổng đang chờ xử lý cho kỳ doanh thu " + request.revenuePeriod()
                            + " — vui lòng duyệt hoặc từ chối đợt đó trước");
        }

        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new AppException(ErrorCode.USER_NOT_EXISTED));

        BatchSettlementCandidatesResponse candidates = getBatchCandidates(request.revenuePeriod());
        if (candidates.eligible() == null || candidates.eligible().isEmpty()) {
            throw new AppException(ErrorCode.SETTLEMENT_NO_ELIGIBLE_REVENUE,
                    "Không có khoản doanh thu nào đủ điều kiện để tất toán cho kỳ " + request.revenuePeriod());
        }

        Settlement saved = buildBatchDraft(period, candidates, admin, request.note());

        log.info("[Settlement] Đã tạo bản nháp settlement TỔNG {} kỳ {} — {} đối tác, tổng {}",
                saved.getSettlementCode(), request.revenuePeriod(), candidates.partnerCount(),
                saved.getSettlementAmount());

        return SettlementResponse.fromEntity(saved);
    }

    /**
     * Tự động tạo bản nháp đợt tất toán TỔNG cho các kỳ ĐÃ ĐÓNG mà chưa có đợt nào.
     *
     * <p>Được gọi bởi {@code SettlementAutoCreateScheduler} — Admin chỉ việc XEM XÉT rồi DUYỆT,
     * không phải tự tạo đợt.
     *
     * <p><b>Quy tắc:</b>
     * <ul>
     *   <li>Chỉ xét các kỳ 10 ngày ĐÃ kết thúc (đã qua ngày cuối của kỳ).</li>
     *   <li>Bỏ qua kỳ đã có đợt tổng (đang mở hoặc đã xử lý) ⇒ không tạo trùng.</li>
     *   <li>Kỳ không có khoản doanh thu đủ điều kiện ⇒ bỏ qua (không tạo đợt rỗng).</li>
     * </ul>
     *
     * @param maxPeriods số kỳ tối đa xét lùi (mới nhất trước)
     * @return số đợt đã tạo
     */
    @Transactional
    public int autoCreateBatchSettlements(int maxPeriods) {
        if (maxPeriods <= 0) {
            return 0;
        }
        User system = resolveSystemUser();
        LocalDate today = LocalDate.now();
        int created = 0;

        // Duyệt lùi từ kỳ gần nhất ⇒ kỳ mới tạo trước (tiền về đối tác sớm hơn).
        for (int i = 0; i < maxPeriods; i++) {
            SettlementPeriod period = resolvePeriodByOffset(today, -i);
            if (period == null || !period.isClosed(today)) {
                continue;
            }
            String periodKey = period.toPeriodString();

            // Đã có đợt tổng "còn sống" cho kỳ này (đang mở hoặc đã duyệt) ⇒ bỏ qua.
            //
            // Đợt đã TỪ CHỐI / HỦY không chặn ⇒ tác vụ nền có thể tạo lại đợt cho kỳ
            // mà Admin đã từ chối (tiền về đối tác sớm hơn, không cần Admin bấm tay).
            boolean hasLiveBatch = settlementRepository
                    .findByScopeAndRevenuePeriod(SettlementScope.BATCH, periodKey)
                    .stream()
                    .anyMatch(s -> s.getStatus().isOpen() || s.getStatus().isApproved());
            if (hasLiveBatch) {
                continue;
            }

            BatchSettlementCandidatesResponse candidates = getBatchCandidatesInternal(periodKey);
            if (candidates.eligible() == null || candidates.eligible().isEmpty()) {
                log.debug("[Settlement] Kỳ {} không có khoản doanh thu đủ điều kiện — bỏ qua", periodKey);
                continue;
            }

            Settlement saved = buildBatchDraft(period, candidates, system,
                    "Tự động tạo từ kỳ tất toán " + period.toDisplayLabel());
            created++;
            log.info("[Settlement] Đã TỰ ĐỘNG tạo bản nháp settlement TỔNG {} kỳ {} — {} đối tác, tổng {}",
                    saved.getSettlementCode(), periodKey, candidates.partnerCount(),
                    saved.getSettlementAmount());
        }

        if (created > 0) {
            notifications.queueChanged(Role.ADMIN, NotificationPublisher.Queue.SETTLEMENTS);
        }
        return created;
    }

    /**
     * Dựng bản nháp đợt tất toán tổng từ danh sách ứng viên — gắn khoản doanh thu vào đợt.
     */
    private Settlement buildBatchDraft(SettlementPeriod period,
                                       BatchSettlementCandidatesResponse candidates,
                                       User createdBy,
                                       String note) {
        Settlement settlement = Settlement.builder()
                .settlementCode(generateSettlementCode())
                .scope(SettlementScope.BATCH)
                // providerProfile = NULL ⇒ đợt tổng cho cả sàn.
                .revenuePeriod(period.toPeriodString())
                .periodStart(period.getStart())
                .periodEnd(period.getEnd())
                .status(SettlementStatus.DRAFT)
                .createdBy(createdBy)
                .note(note)
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
        return settlementRepository.save(saved);
    }

    /**
     * Kỳ chứa ngày {@code today}, lùi về {@code offsetCycles} chu kỳ trước.
     *
     * <p>Mỗi bước lùi nhảy đúng 1 chu kỳ 10 ngày (không phải lùi N ngày) ⇒ duyệt lùi
     * danh sách kỳ đã đóng sẽ không bị bỏ sót kỳ ở giữa tháng.
     */
    private SettlementPeriod resolvePeriodByOffset(LocalDate today, int offsetCycles) {
        return SettlementPeriod.of(today).minusCycles(Math.abs(offsetCycles));
    }

    /**
     * Tài khoản hệ thống dùng làm người tạo cho đợt tự động.
     *
     * <p>Ưu tiên tài khoản ADMIN đầu tiên trong hệ thống; không có thì tạo đợt với
     * {@code createdBy = null} (cột cho phép null) — việc duyệt vẫn do Admin thực hiện.
     */
    private User resolveSystemUser() {
        return userRepository.findFirstByRoleNameOrderByIdAsc(Role.ADMIN).orElse(null);
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
     * <p><b>NGUYÊN TẮC: chỉ khoản thuộc ĐÚNG kỳ đang lập đợt.</b>
     *
     * <p>Yêu cầu nghiệp vụ: "Một đợt tất toán chỉ bao gồm những giao dịch đủ điều kiện
     * mà thôi — ví dụ đợt 01/10/2026 → 10/10/2026 thì chỉ lấy giao dịch trong khoảng
     * thời gian đó". ⇒ KHÔNG gom khoản của kỳ khác vào đợt.
     *
     * <p>⚠️ Trước đây hàm này còn gom thêm "doanh thu chuyển tiếp" — mọi khoản CHƯA
     * tất toán của TẤT CẢ kỳ trước. Đó là nguyên nhân khiến đợt "Kỳ 2 (11–20/11/2026)"
     * lại chứa dữ liệu của cả tháng và các tháng trước.
     *
     * <p><b>DUY NHẤT ngoại lệ — "khoản chưa đủ điều kiện được đẩy sang kỳ sau":</b>
     * khoản thuộc kỳ cũ mà BỊ GIỮ LẠI (chưa đủ điều kiện, trạng thái {@code PENDING})
     * sẽ được xét lại ở kỳ kế tiếp — và CHỈ khi đã đủ điều kiện thì mới vào đợt.
     * Đây không phải "gom kỳ khác vào đợt" một cách tùy tiện mà là chu kỳ đóng hàng của
     * khoản thu: mỗi khoản sẽ được tất toán ở đúng một đợt, và đợt đó là đợt của kỳ mà
     * nó ĐÃ ĐỦ ĐIỀU KIỆN.
     *
     * <p>⚠️ Chỉ khoản {@code PENDING} (chưa đủ điều kiện) mới được đẩy. Khoản
     * {@code ELIGIBLE} (đã đủ điều kiện) của kỳ cũ KHÔNG được kéo sang — nó thuộc về
     * đợt của chính kỳ đó, và nếu kỳ đó chưa có đợt thì đợt đó sẽ được tạo riêng khi
     * kỳ đó đóng (xem {@link #autoCreateBatchSettlements(int)}).
     *
     * <p>⚠️ Vì sao quét TẤT CẢ kỳ trước chứ không chỉ kỳ liền kề? Vì khoản bị giữ
     * phải được xét lại ở MỘT kỳ nào đó đã đóng. Nếu chỉ lấy kỳ liền kề mà kỳ đó
     * đã có đợt rồi (hoặc kỳ đó không có khoản nào đủ điều kiện nên không tạo đợt),
     * khoản sẽ bị BỎ SÓT mãi mãi. Quét tất cả kỳ trước đã đóng ⇒ khoản luôn tìm
     * được chỗ để đẩy tới, đúng như bạn mong đợi ("sẽ bị đẩy qua kỳ sau").
     *
     * <p>Giới hạn an toàn: chỉ khoản {@code PENDING} mới được đẩy ⇒ đợt KHÔNG BAO
     * GIỜ gom đè dữ liệu của kỳ khác vào (đúng lỗi Admin đã báo trước đó).
     *
     * @param revenuePeriod      kỳ đang lập đợt
     * @param includeCarriedOver có lấy thêm khoản BỊ GIỮ LẠI của các kỳ TRƯỚC hay không
     */
    private List<ProviderRevenue> collectCandidates(String revenuePeriod, boolean includeCarriedOver) {
        // Chỉ khoản thuộc ĐÚNG kỳ này — mọi đối tác.
        List<ProviderRevenue> candidates = new ArrayList<>(revenueRepository.findByRevenuePeriod(revenuePeriod));
        if (!includeCarriedOver) {
            return candidates;
        }

        // Khoản BỊ GIỮ LẠI từ các kỳ TRƯỚC: trạng thái PENDING (chưa đủ điều kiện),
        // chưa thuộc đợt nào, và kỳ gốc đã KẾT THÚC.
        SettlementPeriod current = SettlementPeriod.parseOrNull(revenuePeriod);
        if (current == null) {
            return candidates;
        }

        for (ProviderRevenue revenue : revenueRepository.findUnsettledByAllProviders()) {
            // Chỉ khoản CHƯA ĐỦ ĐIỀU KIỆN (PENDING) mới được đẩy sang.
            if (revenue.getStatus() != ProviderRevenueStatus.PENDING) {
                continue;
            }
            // Đã thuộc đợt nào / đã tất toán ⇒ không đẩy.
            if (revenue.getSettlementId() != null
                    || revenue.getStatus() == ProviderRevenueStatus.IN_SETTLEMENT
                    || revenue.getStatus() == ProviderRevenueStatus.SETTLED) {
                continue;
            }
            // Khoản của chính kỳ đang lập đợt ⇒ đã nằm trong danh sách ứng viên.
            if (revenuePeriod.equals(revenue.getRevenuePeriod())) {
                continue;
            }
            // Kỳ gốc CHƯA kết thúc ⇒ khoản vẫn đang ở kỳ hiện tại, chưa phải "chuyển tiếp".
            SettlementPeriod origin = SettlementPeriod.parseOrNull(revenue.getRevenuePeriod());
            if (origin == null || !origin.isClosed(LocalDate.now())) {
                continue;
            }
            // ⚠️ Kỳ gốc phải ĐỨNG TRƯỚC kỳ đang lập đợt. Nếu không kiểm tra, khoản của
            // kỳ VỀ SAU (VD khoản của 11/2026 khi mở đợt cho kỳ 09/2026) cũng bị kéo
            // vào ⇒ danh sách "bị giữ lại" của kỳ 09 hiện khoản của kỳ 11 ⇒ Admin
            // tưởng kỳ 09 đang nợ 4 khoản trong khi thực ra đó là kỳ 11.
            if (!origin.isBefore(current)) {
                continue;
            }
            candidates.add(revenue);
        }
        return candidates;
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
     * Kiểm tra kỳ doanh thu đã kết thúc.
     *
     * <p>Kỳ tất toán chia tháng thành các CHU KỲ 10 NGÀY (1-10, 11-20, 21-cuối tháng).
     * Chỉ tạo được đợt cho kỳ đã qua NGÀY CUỐI của kỳ.
     */
    private void validatePeriodClosed(SettlementPeriod period) {
        LocalDate today = LocalDate.now();
        if (!period.isClosed(today) && !financeProperties.isAllowOpenPeriodSettlement()) {
            throw new AppException(ErrorCode.SETTLEMENT_PERIOD_NOT_CLOSED,
                    "Chỉ cho phép tạo đợt tất toán cho kỳ doanh thu đã kết thúc. Kỳ "
                            + period.toDisplayLabel() + " chưa kết thúc.");
        }
        if (financeProperties.getSettlementGraceMinutes() > 0) {
            java.time.LocalDateTime earliest = period.getEnd().plusDays(1).atStartOfDay()
                    .plusMinutes(financeProperties.getSettlementGraceMinutes());
            if (java.time.LocalDateTime.now().isBefore(earliest)) {
                throw new AppException(ErrorCode.SETTLEMENT_PERIOD_NOT_CLOSED,
                        "Chưa đến thời điểm cho phép tạo đợt tất toán cho kỳ " + period.toDisplayLabel());
            }
        }
    }

    private SettlementPeriod parsePeriod(String period) {
        return SettlementPeriod.parse(period);
    }

    private static BigDecimal nz(BigDecimal value) {
        return value != null ? value : BigDecimal.ZERO;
    }

    private String generateSettlementCode() {
        return "ST" + UUID.randomUUID().toString().replace("-", "").substring(0, 18).toUpperCase();
    }
}
