package com.journeygo.modules.gamification.service;

import com.journeygo.modules.experience.exception.BusinessException;
import com.journeygo.modules.gamification.dto.UserVoucherResponse;
import com.journeygo.modules.gamification.entity.*;
import com.journeygo.modules.gamification.entity.enums.BadgeType;
import com.journeygo.modules.gamification.entity.enums.DiscountType;
import com.journeygo.modules.gamification.entity.enums.PointTransactionType;
import com.journeygo.modules.gamification.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class GamificationServiceTest {

    @Mock
    private BadgeRepository badgeRepository;

    @Mock
    private UserBadgeRepository userBadgeRepository;

    @Mock
    private UserPointRepository userPointRepository;

    @Mock
    private PointTransactionRepository pointTransactionRepository;

    @Mock
    private VoucherRepository voucherRepository;

    @Mock
    private UserVoucherRepository userVoucherRepository;

    @InjectMocks
    private GamificationService gamificationService;

    private Badge sampleBadge;
    private UserPoint sampleUserPoint;
    private Voucher sampleVoucher;

    @BeforeEach
    void setUp() {
        sampleBadge = Badge.builder()
                .id(1L)
                .code("BADGE_DEST_101")
                .name("Dấu chân Chùa Thiên Mụ")
                .destinationId(101L)
                .badgeType(BadgeType.DESTINATION_CHECKIN)
                .bonusPoints(10)
                .active(true)
                .build();

        sampleUserPoint = UserPoint.builder()
                .id(1L)
                .userId(10L)
                .currentBalance(100)
                .lifetimeEarned(100)
                .lifetimeSpent(0)
                .build();

        sampleVoucher = Voucher.builder()
                .id(1L)
                .code("JG-50K")
                .title("Giảm 50.000đ")
                .discountType(DiscountType.FIXED_AMOUNT)
                .discountValue(new BigDecimal("50000.00"))
                .pointsRequired(50)
                .totalQuantity(10)
                .remainingQuantity(10)
                .validDays(30)
                .active(true)
                .build();
    }

    @Test
    void awardCheckInBadge_WhenNew_ShouldAwardBadgeAndBonusPoints() {
        when(badgeRepository.findByDestinationIdAndActiveTrue(101L)).thenReturn(Optional.of(sampleBadge));
        when(userBadgeRepository.findByUserIdAndBadgeId(10L, 1L)).thenReturn(Optional.empty());
        when(userBadgeRepository.save(any(UserBadge.class))).thenAnswer(invocation -> invocation.getArgument(0));

        when(pointTransactionRepository.existsByUserIdAndReferenceId(eq(10L), anyString())).thenReturn(false);
        when(userPointRepository.findByUserId(10L)).thenReturn(Optional.of(sampleUserPoint));
        when(userPointRepository.save(any(UserPoint.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserBadge result = gamificationService.awardCheckInBadge(10L, 101L, "Chùa Thiên Mụ", 1L);

        assertNotNull(result);
        assertEquals(sampleBadge, result.getBadge());
        verify(userBadgeRepository).save(any(UserBadge.class));
        verify(pointTransactionRepository).save(any(PointTransaction.class));
        assertEquals(110, sampleUserPoint.getCurrentBalance());
    }

    @Test
    void awardCheckInBadge_WhenAlreadyEarned_ShouldBeIdempotent() {
        UserBadge existingUserBadge = UserBadge.builder()
                .id(99L)
                .userId(10L)
                .badge(sampleBadge)
                .build();

        when(badgeRepository.findByDestinationIdAndActiveTrue(101L)).thenReturn(Optional.of(sampleBadge));
        when(userBadgeRepository.findByUserIdAndBadgeId(10L, 1L)).thenReturn(Optional.of(existingUserBadge));

        UserBadge result = gamificationService.awardCheckInBadge(10L, 101L, "Chùa Thiên Mụ", 1L);

        assertEquals(99L, result.getId());
        verify(userBadgeRepository, never()).save(any(UserBadge.class));
    }

    @Test
    void awardPoints_WhenNewReference_ShouldAddPointsAndLogTransaction() {
        when(pointTransactionRepository.existsByUserIdAndReferenceId(10L, "REF_123")).thenReturn(false);
        when(userPointRepository.findByUserId(10L)).thenReturn(Optional.of(sampleUserPoint));
        when(userPointRepository.save(any(UserPoint.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserPoint result = gamificationService.awardPoints(
                10L, 20, PointTransactionType.EARNED_TASK, "REF_123", "Hoàn thành Task"
        );

        assertEquals(120, result.getCurrentBalance());
        assertEquals(120, result.getLifetimeEarned());
        verify(pointTransactionRepository).save(any(PointTransaction.class));
    }

    @Test
    void deductPoints_WhenBalanceSufficient_ShouldDeductBalance() {
        when(userPointRepository.findByUserId(10L)).thenReturn(Optional.of(sampleUserPoint));
        when(userPointRepository.save(any(UserPoint.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UserPoint result = gamificationService.deductPoints(
                10L, 40, PointTransactionType.REDEEM_VOUCHER, "VOUCHER_1", "Đổi voucher"
        );

        assertEquals(60, result.getCurrentBalance());
        assertEquals(40, result.getLifetimeSpent());
        verify(pointTransactionRepository).save(any(PointTransaction.class));
    }

    @Test
    void deductPoints_WhenInsufficientBalance_ShouldThrowException() {
        when(userPointRepository.findByUserId(10L)).thenReturn(Optional.of(sampleUserPoint));

        assertThrows(BusinessException.class, () -> gamificationService.deductPoints(
                10L, 200, PointTransactionType.REDEEM_VOUCHER, "VOUCHER_1", "Đổi voucher"
        ));
    }

    @Test
    void redeemVoucher_WhenValid_ShouldIssueUserVoucher() {
        when(voucherRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(sampleVoucher));
        when(userPointRepository.findByUserId(10L)).thenReturn(Optional.of(sampleUserPoint));
        when(userPointRepository.save(any(UserPoint.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(voucherRepository.save(any(Voucher.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(userVoucherRepository.save(any(UserVoucher.class))).thenAnswer(invocation -> {
            UserVoucher uv = invocation.getArgument(0);
            uv.setId(55L);
            return uv;
        });

        UserVoucherResponse response = gamificationService.redeemVoucher(10L, 1L);

        assertNotNull(response);
        assertEquals(50, response.pointsSpent());
        assertEquals(9, sampleVoucher.getRemainingQuantity());
        assertEquals(50, sampleUserPoint.getCurrentBalance());
        verify(userVoucherRepository).save(any(UserVoucher.class));
    }
}
