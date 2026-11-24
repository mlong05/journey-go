package com.journeygo.modules.settlement.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.modules.finance.config.FinanceProperties;
import com.journeygo.modules.notification.service.NotificationPublisher;
import com.journeygo.modules.providerprofile.entity.ProviderProfile;
import com.journeygo.modules.providerprofile.repository.ProviderProfileRepository;
import com.journeygo.modules.providerrevenue.dto.response.EligibilityEvaluationResponse;
import com.journeygo.modules.providerrevenue.entity.ProviderRevenue;
import com.journeygo.modules.providerrevenue.entity.enums.DeferredReason;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertFalse;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/**
 * Tác vụ đợt tất toán TỔNG (scope = BATCH) — 1 đợt gom doanh thu của TOÀN BỘ đối tác.
 *
 * <p>── Vì sao cần test riêng? ──
 * Luồng cũ (mỗi đối tác một đợt) đã được cover bởi test của SettlementService.
 * Luồng mới có 3 điểm rủi ro riêng:
 * <ol>
 *   <li>Khoản KHÔNG đủ điều kiện KHÔNG được gom vào đợt (giữ nguyên luật lọc cũ).</li>
 *   <li>Khoản đã thuộc đợt khác không được gom lại (chống trùng tiền).</li>
 *   <li>Mỗi kỳ chỉ được có MỘT đợt tổng (ràng buộc DB + kiểm tra ở service).</li>
 * </ol>
 */
@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class BatchSettlementServiceTest {

    @Mock private SettlementRepository settlementRepository;
    @Mock private SettlementDetailRepository detailRepository;
    @Mock private ProviderRevenueRepository revenueRepository;
    @Mock private ProviderProfileRepository providerProfileRepository;
    @Mock private WalletRepository walletRepository;
    @Mock private UserRepository userRepository;
    @Mock private ProviderRevenueService revenueService;
    @Mock private WalletService walletService;
    @Mock private NotificationPublisher notifications;

    @InjectMocks private BatchSettlementService service;

    private FinanceProperties financeProperties;
    private User admin;

    /**
     * Kỳ 10 ngày ĐÃ ĐÓNG — luôn hợp lệ để tạo đợt tất toán.
     *
     * <p>Kỳ 3 của tháng trước (21 → cuối tháng trước) luôn đã kết thúc.
     */
    private static final String CLOSED_PERIOD = SettlementPeriod
            .of(YearMonth.now().minusMonths(1), SettlementPeriod.CYCLE_COUNT)
            .toPeriodString();

    /**
     * Kỳ 10 ngày CHƯA kết thúc — kỳ 1 của tháng hiện tại (chưa qua ngày 10 hôm nay).
     *
     * <p>Chỉ dùng khi hôm nay ≤ 10; nếu hôm nay đã qua ngày 10 thì kỳ 1 đã đóng.
     */
    private static String openPeriod() {
        YearMonth current = YearMonth.now();
        int day = LocalDate.now().getDayOfMonth();
        // Nếu hôm nay đã qua ngày 10 ⇒ kỳ 1 đã đóng ⇒ dùng kỳ 2 (đóng từ ngày 20).
        int cycle = day <= 10 ? 1 : 2;
        return SettlementPeriod.of(current, cycle).toPeriodString();
    }

    @BeforeEach
    void setUp() {
        financeProperties = new FinanceProperties();
        financeProperties.setAllowOpenPeriodSettlement(false);
        financeProperties.setSettlementGraceMinutes(0);
        org.springframework.test.util.ReflectionTestUtils.setField(service, "financeProperties", financeProperties);

        admin = new User();
        admin.setId(1L);
        admin.setRole(Role.fromString(Role.ADMIN));
        lenient().when(userRepository.findById(1L)).thenReturn(Optional.of(admin));
    }

    // ── Helpers ───────────────────────────────────────────────────────────

    private ProviderProfile partner(Long id, String name) {
        ProviderProfile p = new ProviderProfile();
        p.setId(id);
        p.setProviderName(name);
        return p;
    }

    private ProviderRevenue revenue(Long id, ProviderProfile partner, String period,
                                    BigDecimal gross, BigDecimal net) {
        ProviderRevenue r = new ProviderRevenue();
        r.setId(id);
        r.setProviderProfile(partner);
        r.setRevenuePeriod(period);
        r.setGrossAmount(gross);
        r.setRefundAmount(BigDecimal.ZERO);
        r.setCommissionAmount(gross.subtract(net));
        r.setAdjustmentAmount(BigDecimal.ZERO);
        r.setProviderNetAmount(net);
        r.setStatus(ProviderRevenueStatus.ELIGIBLE);
        return r;
    }

    private void stubCandidates(List<ProviderRevenue> revenues) {
        lenient().when(revenueRepository.findByRevenuePeriod(CLOSED_PERIOD)).thenReturn(revenues);
        lenient().when(revenueRepository.findUnsettledByAllProviders()).thenReturn(List.of());
        for (ProviderRevenue r : revenues) {
            lenient().when(revenueRepository.findById(r.getId())).thenReturn(Optional.of(r));
            // Service dùng bản khóa pessimistic khi gắn khoản vào đợt.
            lenient().when(revenueRepository.findByIdForUpdate(r.getId())).thenReturn(Optional.of(r));
            lenient().when(revenueService.evaluateEligibility(r.getId()))
                    .thenReturn(EligibilityEvaluationResponse.builder()
                            .eligible(true)
                            .checks(List.of())
                            .build());
        }
    }

    // ── Ứng viên tất toán tổng ────────────────────────────────────────────

    @Test
    @DisplayName("Ứng viên tổng gom khoản của TOÀN BỘ đối tác trong kỳ")
    void getBatchCandidates_gathersAllPartners() {
        ProviderProfile a = partner(10L, "Đối tác A");
        ProviderProfile b = partner(20L, "Đối tác B");

        List<ProviderRevenue> revenues = List.of(
                revenue(1L, a, CLOSED_PERIOD, new BigDecimal("1000000"), new BigDecimal("800000")),
                revenue(2L, b, CLOSED_PERIOD, new BigDecimal("2000000"), new BigDecimal("1600000"))
        );
        stubCandidates(revenues);

        BatchSettlementCandidatesResponse result = service.getBatchCandidates(CLOSED_PERIOD);

        assertEquals(2, result.eligible().size(), "Phải gom khoản của cả 2 đối tác");
        assertEquals(2, result.partnerCount(), "Số đối tác phải là 2");
        assertEquals(new BigDecimal("3000000"), result.totals().grossAmount());
        assertEquals(new BigDecimal("2400000"), result.totals().settlementAmount());
        assertTrue(result.held().isEmpty());
    }

    @Test
    @DisplayName("Khoản KHÔNG đủ điều kiện bị giữ lại kèm lý do — không vào đợt")
    void getBatchCandidates_holdsIneligibleWithReason() {
        ProviderProfile a = partner(10L, "Đối tác A");
        ProviderProfile b = partner(20L, "Đối tác B");

        ProviderRevenue ok = revenue(1L, a, CLOSED_PERIOD,
                new BigDecimal("1000000"), new BigDecimal("800000"));
        ProviderRevenue held = revenue(2L, b, CLOSED_PERIOD,
                new BigDecimal("500000"), new BigDecimal("400000"));

        lenient().when(revenueRepository.findByRevenuePeriod(CLOSED_PERIOD))
                .thenReturn(List.of(ok, held));
        lenient().when(revenueRepository.findUnsettledByAllProviders()).thenReturn(List.of());
        lenient().when(revenueRepository.findById(1L)).thenReturn(Optional.of(ok));
        lenient().when(revenueRepository.findById(2L)).thenReturn(Optional.of(held));
        lenient().when(revenueService.evaluateEligibility(1L))
                .thenReturn(EligibilityEvaluationResponse.builder().eligible(true).build());
        // Chưa trải nghiệm xong ⇒ giữ lại.
        lenient().when(revenueService.evaluateEligibility(2L))
                .thenReturn(EligibilityEvaluationResponse.builder()
                        .eligible(false)
                        .deferredReason(DeferredReason.BOOKING_NOT_COMPLETED)
                        .build());

        BatchSettlementCandidatesResponse result = service.getBatchCandidates(CLOSED_PERIOD);

        assertEquals(1, result.eligible().size());
        assertEquals(1, result.held().size());
        assertEquals(DeferredReason.BOOKING_NOT_COMPLETED, result.held().get(0).deferredReason());
        assertEquals("Đối tác B", result.held().get(0).providerName());
        // Tổng tiền CHỈ tính khoản đủ điều kiện.
        assertEquals(new BigDecimal("800000"), result.totals().settlementAmount());
    }

    @Test
    @DisplayName("Khoản đã thuộc đợt khác không được gom lại (chống trùng tiền)")
    void getBatchCandidates_skipsAlreadySettled() {
        ProviderProfile a = partner(10L, "Đối tác A");

        ProviderRevenue settled = revenue(1L, a, CLOSED_PERIOD,
                new BigDecimal("1000000"), new BigDecimal("800000"));
        settled.setStatus(ProviderRevenueStatus.SETTLED);

        ProviderRevenue inSettlement = revenue(2L, a, CLOSED_PERIOD,
                new BigDecimal("1000000"), new BigDecimal("800000"));
        inSettlement.setStatus(ProviderRevenueStatus.IN_SETTLEMENT);

        lenient().when(revenueRepository.findByRevenuePeriod(CLOSED_PERIOD))
                .thenReturn(List.of(settled, inSettlement));
        lenient().when(revenueRepository.findUnsettledByAllProviders()).thenReturn(List.of());

        BatchSettlementCandidatesResponse result = service.getBatchCandidates(CLOSED_PERIOD);

        assertTrue(result.eligible().isEmpty(), "Khoản đã tất toán/in-đợt không được gom lại");
        assertTrue(result.held().isEmpty(), "Khoản đã thuộc đợt khác không phải 'bị giữ lại'");
    }

    @Test
    @DisplayName("CHỈ gom khoản thuộc ĐÚNG kỳ — không kéo khoản của kỳ khác vào")
    void getBatchCandidates_onlyIncludesExactPeriod() {
        ProviderProfile a = partner(10L, "Đối tác B");
        String olderPeriod = SettlementPeriod
                .of(YearMonth.now().minusMonths(3), SettlementPeriod.CYCLE_COUNT)
                .toPeriodString();

        // Khoản của kỳ TRƯỚC — chưa tất toán (đã bị từ chối ở kỳ đó).
        ProviderRevenue otherPeriod = revenue(1L, a, olderPeriod,
                new BigDecimal("1000000"), new BigDecimal("800000"));

        lenient().when(revenueRepository.findByRevenuePeriod(CLOSED_PERIOD)).thenReturn(List.of());
        lenient().when(revenueRepository.findUnsettledByAllProviders())
                .thenReturn(List.of(otherPeriod));
        lenient().when(revenueRepository.findById(1L)).thenReturn(Optional.of(otherPeriod));
        lenient().when(revenueService.evaluateEligibility(1L))
                .thenReturn(EligibilityEvaluationResponse.builder().eligible(true).build());

        BatchSettlementCandidatesResponse result = service.getBatchCandidates(CLOSED_PERIOD);

        assertTrue(result.eligible().isEmpty(),
                "Khoản của kỳ KHÁC không được gom vào đợt của kỳ đang chọn");
        assertTrue(result.held().isEmpty(),
                "Khoản ngoài kỳ không được tính vào 'đủ điều kiện' lẫn 'bị giữ lại'");
    }

    // ── Khoản bị giữ lại (chưa đủ điều kiện) ─────────────────────────────

    @Test
    @DisplayName("Xem khoản bị giữ lại của kỳ — kèm lý do và kỳ sẽ xét lại")
    void getHeldItems_listsHeldWithReason() {
        ProviderProfile a = partner(10L, "Đối tác A");

        ProviderRevenue held = revenue(1L, a, CLOSED_PERIOD,
                new BigDecimal("500000"), new BigDecimal("400000"));
        held.setStatus(ProviderRevenueStatus.PENDING);
        held.setDeferredReason(DeferredReason.BOOKING_NOT_COMPLETED);

        lenient().when(revenueRepository.findByRevenuePeriod(CLOSED_PERIOD))
                .thenReturn(List.of(held));
        lenient().when(revenueRepository.findUnsettledByAllProviders()).thenReturn(List.of());
        lenient().when(revenueService.evaluateEligibilityInternal(1L))
                .thenReturn(EligibilityEvaluationResponse.builder()
                        .eligible(false)
                        .deferredReason(DeferredReason.BOOKING_NOT_COMPLETED)
                        .checks(List.of(
                                EligibilityEvaluationResponse.CheckItem.builder()
                                        .code("3_BOOKING_COMPLETED")
                                        .description("Booking đã hoàn thành trải nghiệm")
                                        .passed(false)
                                        .detail("Booking chưa hoàn thành trải nghiệm")
                                        .build()))
                        .build());

        SettlementHeldResponse result = service.getHeldItems(CLOSED_PERIOD);

        assertEquals(1, result.held().size(), "Phải thấy khoản bị giữ lại của kỳ");
        assertEquals(DeferredReason.BOOKING_NOT_COMPLETED,
                result.held().get(0).deferredReason());
        assertEquals(1, result.held().get(0).failedChecks().size(),
                "Phải kèm điều kiện chưa đạt");
        assertEquals(new BigDecimal("400000"), result.totalAmount());
        assertEquals(1, result.partnerCount());
        // Kỳ kế tiếp là nơi khoản này sẽ được xét lại.
        assertEquals(SettlementPeriod.parse(CLOSED_PERIOD).plusCycles(1).toPeriodString(),
                result.carriedTo());
    }

    @Test
    @DisplayName("Khoản đủ điều kiện KHÔNG tính là 'bị giữ lại'")
    void getHeldItems_excludesEligible() {
        ProviderProfile a = partner(10L, "Đối tác A");
        ProviderRevenue eligible = revenue(1L, a, CLOSED_PERIOD,
                new BigDecimal("1000000"), new BigDecimal("800000"));

        lenient().when(revenueRepository.findByRevenuePeriod(CLOSED_PERIOD))
                .thenReturn(List.of(eligible));
        lenient().when(revenueRepository.findUnsettledByAllProviders()).thenReturn(List.of());
        lenient().when(revenueService.evaluateEligibilityInternal(1L))
                .thenReturn(EligibilityEvaluationResponse.builder().eligible(true).build());

        SettlementHeldResponse result = service.getHeldItems(CLOSED_PERIOD);

        assertTrue(result.held().isEmpty(), "Khoản đủ điều kiện không phải 'bị giữ lại'");
        assertEquals(BigDecimal.ZERO, result.totalAmount());
    }

    // ── Đẩy khoản chưa đủ điều kiện sang kỳ kế tiếp ───────────────────────

    @Test
    @DisplayName("Khoản CHƯA ĐỦ ĐIỀU KIỆN của kỳ trước được đẩy sang kỳ này")
    void getBatchCandidates_carriesHeldFromPreviousPeriod() {
        ProviderProfile a = partner(10L, "Đối tác A");
        String previousPeriod = SettlementPeriod.parse(CLOSED_PERIOD).minusCycles(1).toPeriodString();

        // Khoản của kỳ TRƯỚC, chưa đủ điều kiện ⇒ được đẩy sang kỳ này.
        ProviderRevenue carried = revenue(1L, a, previousPeriod,
                new BigDecimal("500000"), new BigDecimal("400000"));
        carried.setStatus(ProviderRevenueStatus.PENDING);
        carried.setDeferredReason(DeferredReason.BOOKING_NOT_COMPLETED);

        // Khoản của kỳ TRƯỚC, ĐÃ đủ điều kiện ⇒ KHÔNG đẩy (thuộc đợt của kỳ đó).
        ProviderRevenue oldEligible = revenue(2L, a, previousPeriod,
                new BigDecimal("1000000"), new BigDecimal("800000"));

        lenient().when(revenueRepository.findByRevenuePeriod(CLOSED_PERIOD)).thenReturn(List.of());
        lenient().when(revenueRepository.findUnsettledByAllProviders())
                .thenReturn(List.of(carried, oldEligible));
        lenient().when(revenueService.evaluateEligibility(1L))
                .thenReturn(EligibilityEvaluationResponse.builder().eligible(true).build());
        lenient().when(revenueService.evaluateEligibility(2L))
                .thenReturn(EligibilityEvaluationResponse.builder().eligible(true).build());

        BatchSettlementCandidatesResponse result = service.getBatchCandidates(CLOSED_PERIOD);

        assertEquals(1, result.eligible().size(),
                "Chỉ khoản BỊ GIỮ LẠI được đẩy sang, khoản đã đủ điều kiện thì không");
        assertEquals(1L, result.eligible().get(0).id());
    }

    @Test
    @DisplayName("Danh sách 'bị giữ lại' gồm khoản của kỳ này + khoản đẩy từ kỳ trước, KHÔNG có kỳ về sau")
    void getBatchCandidates_heldListIsScopedToQueriedPeriod() {
        ProviderProfile a = partner(10L, "Đối tác A");
        String previousPeriod = SettlementPeriod.parse(CLOSED_PERIOD).minusCycles(1).toPeriodString();
        String laterPeriod = SettlementPeriod.parse(CLOSED_PERIOD).plusCycles(1).toPeriodString();

        // Khoản THỰC SỰ của kỳ đang xem, chưa đủ điều kiện.
        ProviderRevenue ownHeld = revenue(1L, a, CLOSED_PERIOD,
                new BigDecimal("500000"), new BigDecimal("400000"));
        ownHeld.setStatus(ProviderRevenueStatus.PENDING);
        ownHeld.setDeferredReason(DeferredReason.BOOKING_NOT_COMPLETED);

        // Khoản của kỳ TRƯỚC, vẫn chưa đủ điều kiện ⇒ được đẩy sang kỳ này để xét
        // lại, nhưng VẪN chưa đủ ⇒ hiển thị kèm cờ carriedOver.
        ProviderRevenue carriedHeld = revenue(2L, a, previousPeriod,
                new BigDecimal("300000"), new BigDecimal("240000"));
        carriedHeld.setStatus(ProviderRevenueStatus.PENDING);
        carriedHeld.setDeferredReason(DeferredReason.BOOKING_NOT_COMPLETED);

        // Khoản của kỳ VỀ SAU ⇒ TUYỆT ĐỐI không được lọt vào danh sách của kỳ này.
        ProviderRevenue futureHeld = revenue(3L, a, laterPeriod,
                new BigDecimal("900000"), new BigDecimal("720000"));
        futureHeld.setStatus(ProviderRevenueStatus.PENDING);
        futureHeld.setDeferredReason(DeferredReason.BOOKING_NOT_COMPLETED);

        lenient().when(revenueRepository.findByRevenuePeriod(CLOSED_PERIOD))
                .thenReturn(List.of(ownHeld));
        lenient().when(revenueRepository.findUnsettledByAllProviders())
                .thenReturn(List.of(ownHeld, carriedHeld, futureHeld));
        lenient().when(revenueService.evaluateEligibility(1L)).thenReturn(
                EligibilityEvaluationResponse.builder().eligible(false).build());
        lenient().when(revenueService.evaluateEligibility(2L)).thenReturn(
                EligibilityEvaluationResponse.builder().eligible(false).build());
        lenient().when(revenueService.evaluateEligibility(3L)).thenReturn(
                EligibilityEvaluationResponse.builder().eligible(false).build());

        BatchSettlementCandidatesResponse result = service.getBatchCandidates(CLOSED_PERIOD);

        assertEquals(2, result.held().size(),
                "Gồm khoản của kỳ này + khoản đẩy từ kỳ trước, KHÔNG gồm khoản kỳ về sau");

        BatchSettlementCandidatesResponse.HeldItem own = result.held().stream()
                .filter(h -> h.revenueId().equals(1L)).findFirst().orElseThrow();
        assertEquals(CLOSED_PERIOD, own.revenuePeriod());
        assertFalse(Boolean.TRUE.equals(own.carriedOver()), "Khoản của kỳ này không phải carriedOver");

        BatchSettlementCandidatesResponse.HeldItem carried = result.held().stream()
                .filter(h -> h.revenueId().equals(2L)).findFirst().orElseThrow();
        assertEquals(previousPeriod, carried.revenuePeriod(), "Khoản đẩy sang giữ nguyên kỳ GỐC");
        assertTrue(Boolean.TRUE.equals(carried.carriedOver()), "Khoản đẩy từ kỳ trước phải có cờ carriedOver");
    }

    @Test
    @DisplayName("Khoản đã đủ điều kiện của kỳ cũ KHÔNG bị kéo sang kỳ mới")
    void getBatchCandidates_doesNotCarryOldEligibleRevenue() {
        ProviderProfile a = partner(10L, "Đối tác A");
        String olderPeriod = SettlementPeriod
                .of(YearMonth.now().minusMonths(3), SettlementPeriod.CYCLE_COUNT)
                .toPeriodString();

        // Khoản của kỳ cũ — đã đủ điều kiện nhưng chưa có đợt (đợt của kỳ đó được tạo riêng).
        ProviderRevenue oldEligible = revenue(1L, a, olderPeriod,
                new BigDecimal("1000000"), new BigDecimal("800000"));

        lenient().when(revenueRepository.findByRevenuePeriod(CLOSED_PERIOD)).thenReturn(List.of());
        lenient().when(revenueRepository.findUnsettledByAllProviders())
                .thenReturn(List.of(oldEligible));
        lenient().when(revenueRepository.findById(1L)).thenReturn(Optional.of(oldEligible));
        lenient().when(revenueService.evaluateEligibility(1L))
                .thenReturn(EligibilityEvaluationResponse.builder().eligible(true).build());

        BatchSettlementCandidatesResponse result = service.getBatchCandidates(CLOSED_PERIOD);

        assertTrue(result.eligible().isEmpty(),
                "Khoản đã đủ điều kiện của kỳ cũ KHÔNG được kéo sang đợt của kỳ mới");
    }

    // ── Tạo đợt tổng ─────────────────────────────────────────────────────

    @Test
    @DisplayName("Tạo đợt tổng: scope=BATCH, không có đối tác duy nhất, gắn chi tiết theo từng đối tác")
    void createBatchSettlement_createsBatchWithDetails() {
        ProviderProfile a = partner(10L, "Đối tác A");
        ProviderProfile b = partner(20L, "Đối tác B");

        List<ProviderRevenue> revenues = List.of(
                revenue(1L, a, CLOSED_PERIOD, new BigDecimal("1000000"), new BigDecimal("800000")),
                revenue(2L, b, CLOSED_PERIOD, new BigDecimal("2000000"), new BigDecimal("1600000"))
        );
        stubCandidates(revenues);

        // Lưu đợt tổng — gán ID để service dùng cho SettlementDetail.
        when(settlementRepository.save(any(Settlement.class))).thenAnswer(inv -> {
            Settlement s = inv.getArgument(0);
            if (s.getId() == null) {
                s.setId(100L);
            }
            return s;
        });
        lenient().when(settlementRepository.findByScopeAndRevenuePeriod(
                eq(SettlementScope.BATCH), eq(CLOSED_PERIOD))).thenReturn(List.of());
        lenient().when(detailRepository.findBySettlementIdWithRevenue(anyLong())).thenReturn(List.of());

        service.createBatchSettlement(
                new CreateBatchSettlementRequest(CLOSED_PERIOD, "Đối soát tháng"), 1L);

        ArgumentCaptor<Settlement> captor = ArgumentCaptor.forClass(Settlement.class);
        verify(settlementRepository, org.mockito.Mockito.atLeastOnce()).save(captor.capture());

        Settlement created = captor.getAllValues().stream()
                .filter(s -> s.getScope() == SettlementScope.BATCH)
                .findFirst()
                .orElseThrow(() -> new AssertionError("Chưa tạo đợt tất toán tổng"));

        assertNull(created.getProviderProfile(), "Đợt tổng KHÔNG gắn một đối tác duy nhất");
        assertEquals(CLOSED_PERIOD, created.getRevenuePeriod());
        assertEquals(SettlementStatus.DRAFT, created.getStatus());
        assertEquals(2, created.getPartnerCount());
        assertEquals(new BigDecimal("2400000"), created.getSettlementAmount());

        // Mỗi khoản đủ điều kiện phải có 1 SettlementDetail gắn ĐÚNG đối tác của nó.
        ArgumentCaptor<SettlementDetail> detailCaptor =
                ArgumentCaptor.forClass(SettlementDetail.class);
        verify(detailRepository, org.mockito.Mockito.times(2)).save(detailCaptor.capture());
        for (SettlementDetail d : detailCaptor.getAllValues()) {
            assertNotNull(d.getProviderProfile(),
                    "Mỗi chi tiết phải biết đối tác để cộng tiền vào đúng ví khi duyệt");
        }
    }

    @Test
    @DisplayName("Không tạo được 2 đợt tổng cho cùng một kỳ")
    void createBatchSettlement_rejectsDuplicateForSamePeriod() {
        Settlement existing = Settlement.builder()
                .id(100L)
                .scope(SettlementScope.BATCH)
                .revenuePeriod(CLOSED_PERIOD)
                .status(SettlementStatus.DRAFT)
                .settlementCode("ST-EXISTING")
                .build();

        when(settlementRepository.findByScopeAndRevenuePeriod(
                eq(SettlementScope.BATCH), eq(CLOSED_PERIOD))).thenReturn(List.of(existing));

        AppException ex = assertThrows(AppException.class, () ->
                service.createBatchSettlement(
                        new CreateBatchSettlementRequest(CLOSED_PERIOD, null), 1L));

        assertNotNull(ex.getMessage());
        verify(settlementRepository, never()).save(any(Settlement.class));
    }

    @Test
    @DisplayName("Từ chối tạo đợt tổng cho kỳ CHƯA kết thúc")
    void createBatchSettlement_rejectsOpenPeriod() {
        String openPeriod = openPeriod();

        AppException ex = assertThrows(AppException.class, () ->
                service.createBatchSettlement(
                        new CreateBatchSettlementRequest(openPeriod, null), 1L));

        assertNotNull(ex.getMessage());
        verify(settlementRepository, never()).save(any(Settlement.class));
    }

    @Test
    @DisplayName("Từ chối tạo đợt tổng khi kỳ không có khoản nào đủ điều kiện")
    void createBatchSettlement_rejectsWhenNoEligibleRevenue() {
        ProviderProfile a = partner(10L, "Đối tác A");
        ProviderRevenue held = revenue(1L, a, CLOSED_PERIOD,
                new BigDecimal("500000"), new BigDecimal("400000"));

        lenient().when(revenueRepository.findByRevenuePeriod(CLOSED_PERIOD))
                .thenReturn(List.of(held));
        lenient().when(revenueRepository.findUnsettledByAllProviders()).thenReturn(List.of());
        lenient().when(revenueRepository.findById(1L)).thenReturn(Optional.of(held));
        lenient().when(revenueService.evaluateEligibility(1L))
                .thenReturn(EligibilityEvaluationResponse.builder()
                        .eligible(false)
                        .deferredReason(DeferredReason.BOOKING_NOT_COMPLETED)
                        .build());
        lenient().when(settlementRepository.findByScopeAndRevenuePeriod(
                eq(SettlementScope.BATCH), eq(CLOSED_PERIOD))).thenReturn(List.of());

        AppException ex = assertThrows(AppException.class, () ->
                service.createBatchSettlement(
                        new CreateBatchSettlementRequest(CLOSED_PERIOD, null), 1L));

        assertNotNull(ex.getMessage());
        verify(settlementRepository, never()).save(any(Settlement.class));
    }

    // ── Từ chối → tạo lại thủ công ──────────────────────────────────────

    @Test
    @DisplayName("Tạo lại được đợt tổng cho kỳ đã bị TỪ CHỐI")
    void createBatchSettlement_allowsRecreateAfterRejection() {
        ProviderProfile a = partner(10L, "Đối tác A");

        // Đợt cũ đã bị từ chối ⇒ không còn chiếm chỗ ⇒ Admin tạo lại được.
        Settlement rejected = Settlement.builder()
                .id(100L)
                .scope(SettlementScope.BATCH)
                .revenuePeriod(CLOSED_PERIOD)
                .status(SettlementStatus.REJECTED)
                .settlementCode("ST-REJECTED")
                .build();

        List<ProviderRevenue> revenues = List.of(
                revenue(1L, a, CLOSED_PERIOD, new BigDecimal("1000000"), new BigDecimal("800000"))
        );
        stubCandidates(revenues);

        when(settlementRepository.findByScopeAndRevenuePeriod(
                eq(SettlementScope.BATCH), eq(CLOSED_PERIOD))).thenReturn(List.of(rejected));
        when(settlementRepository.save(any(Settlement.class))).thenAnswer(inv -> {
            Settlement s = inv.getArgument(0);
            if (s.getId() == null) {
                s.setId(200L);
            }
            return s;
        });
        lenient().when(detailRepository.findBySettlementIdWithRevenue(anyLong())).thenReturn(List.of());

        SettlementResponse created = service.createBatchSettlement(
                new CreateBatchSettlementRequest(CLOSED_PERIOD, "Tạo lại sau khi từ chối"), 1L);

        assertEquals(CLOSED_PERIOD, created.revenuePeriod());
        assertEquals(SettlementStatus.DRAFT, created.status());
    }

    @Test
    @DisplayName("Từ chối tạo lại khi kỳ có đợt ĐANG CHỜ DUYỆT")
    void createBatchSettlement_rejectsRecreateWhileOpenBatchExists() {
        Settlement open = Settlement.builder()
                .id(100L)
                .scope(SettlementScope.BATCH)
                .revenuePeriod(CLOSED_PERIOD)
                .status(SettlementStatus.DRAFT)
                .settlementCode("ST-DRAFT")
                .build();

        when(settlementRepository.findByScopeAndRevenuePeriod(
                eq(SettlementScope.BATCH), eq(CLOSED_PERIOD))).thenReturn(List.of(open));

        AppException ex = assertThrows(AppException.class, () ->
                service.createBatchSettlement(
                        new CreateBatchSettlementRequest(CLOSED_PERIOD, null), 1L));

        assertNotNull(ex.getMessage());
        verify(settlementRepository, never()).save(any(Settlement.class));
    }
}
