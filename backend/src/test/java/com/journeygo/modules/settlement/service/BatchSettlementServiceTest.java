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
import java.time.YearMonth;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
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

    /** Kỳ đã đóng (kỳ trước) — luôn hợp lệ để tạo đợt tất toán. */
    private static final String CLOSED_PERIOD = YearMonth.now().minusMonths(1).toString();

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
    @DisplayName("Doanh thu chuyển tiếp từ kỳ TRƯỚC được mang sang kỳ đang lập đợt")
    void getBatchCandidates_carriesOverFromPreviousPeriod() {
        ProviderProfile a = partner(10L, "Đối tác A");
        String olderPeriod = YearMonth.now().minusMonths(3).toString();

        ProviderRevenue carried = revenue(1L, a, olderPeriod,
                new BigDecimal("1000000"), new BigDecimal("800000"));

        lenient().when(revenueRepository.findByRevenuePeriod(CLOSED_PERIOD)).thenReturn(List.of());
        lenient().when(revenueRepository.findUnsettledByAllProviders())
                .thenReturn(List.of(carried));
        lenient().when(revenueRepository.findById(1L)).thenReturn(Optional.of(carried));
        lenient().when(revenueService.evaluateEligibility(1L))
                .thenReturn(EligibilityEvaluationResponse.builder().eligible(true).build());

        BatchSettlementCandidatesResponse result = service.getBatchCandidates(CLOSED_PERIOD);

        assertEquals(1, result.eligible().size(), "Doanh thu kỳ trước chưa tất toán phải được mang sang");
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
        lenient().when(settlementRepository.findFirstByScopeAndRevenuePeriod(
                eq(SettlementScope.BATCH), eq(CLOSED_PERIOD))).thenReturn(Optional.empty());
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

        when(settlementRepository.findFirstByScopeAndRevenuePeriod(
                eq(SettlementScope.BATCH), eq(CLOSED_PERIOD))).thenReturn(Optional.of(existing));

        AppException ex = assertThrows(AppException.class, () ->
                service.createBatchSettlement(
                        new CreateBatchSettlementRequest(CLOSED_PERIOD, null), 1L));

        assertNotNull(ex.getMessage());
        verify(settlementRepository, never()).save(any(Settlement.class));
    }

    @Test
    @DisplayName("Từ chối tạo đợt tổng cho kỳ CHƯA kết thúc")
    void createBatchSettlement_rejectsOpenPeriod() {
        String openPeriod = YearMonth.now().toString();

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
        lenient().when(settlementRepository.findFirstByScopeAndRevenuePeriod(
                eq(SettlementScope.BATCH), eq(CLOSED_PERIOD))).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class, () ->
                service.createBatchSettlement(
                        new CreateBatchSettlementRequest(CLOSED_PERIOD, null), 1L));

        assertNotNull(ex.getMessage());
        verify(settlementRepository, never()).save(any(Settlement.class));
    }
}
