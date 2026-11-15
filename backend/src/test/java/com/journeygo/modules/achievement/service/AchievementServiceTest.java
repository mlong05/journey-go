package com.journeygo.modules.achievement.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.achievement.dto.*;
import com.journeygo.modules.achievement.entity.Achievement;
import com.journeygo.modules.achievement.entity.UserAchievement;
import com.journeygo.modules.achievement.entity.enums.AchievementCategory;
import com.journeygo.modules.achievement.entity.enums.AchievementStatus;
import com.journeygo.modules.achievement.entity.enums.AchievementTier;
import com.journeygo.modules.achievement.repository.AchievementRepository;
import com.journeygo.modules.achievement.repository.UserAchievementRepository;
import com.journeygo.modules.gamification.entity.Badge;
import com.journeygo.modules.gamification.entity.UserBadge;
import com.journeygo.modules.gamification.entity.UserPoint;
import com.journeygo.modules.gamification.entity.enums.PointTransactionType;
import com.journeygo.modules.gamification.repository.UserBadgeRepository;
import com.journeygo.modules.gamification.service.GamificationService;
import com.journeygo.modules.notification.service.NotificationPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AchievementServiceTest {

    @Mock
    private AchievementRepository achievementRepository;

    @Mock
    private UserAchievementRepository userAchievementRepository;

    @Mock
    private GamificationService gamificationService;

    @Mock
    private UserBadgeRepository userBadgeRepository;

    @Mock
    private com.journeygo.modules.gamification.repository.BadgeRepository badgeRepository;

    @Spy
    private NotificationPublisher notifications =
            new NotificationPublisher(mock(ApplicationEventPublisher.class));

    @InjectMocks
    private AchievementService achievementService;

    private Achievement tourAchievement;
    private Achievement checkinAchievement;
    private Badge sampleBadge;

    @BeforeEach
    void setUp() {
        sampleBadge = Badge.builder()
                .id(10L)
                .code("BADGE_FIRST_TOUR")
                .name("Nhà Khám Phá Tập Sự 🥉")
                .iconUrl("https://example.com/badge1.png")
                .build();

        tourAchievement = Achievement.builder()
                .id(1L)
                .code("FIRST_TOUR")
                .name("Bước Chân Đầu Tiên")
                .description("Hoàn thành tour đầu tiên trên JourneyGo")
                .category(AchievementCategory.TOUR)
                .tier(AchievementTier.BRONZE)
                .targetValue(1)
                .pointsReward(100)
                .badgeName("Nhà Khám Phá Tập Sự 🥉")
                .badgeIcon("https://example.com/badge1.png")
                .badge(sampleBadge)
                .active(true)
                .build();

        checkinAchievement = Achievement.builder()
                .id(2L)
                .code("FIRST_CHECKIN")
                .name("Dấu Chân Đầu Tiên")
                .description("Check-in GPS hợp lệ tại địa điểm đầu tiên")
                .category(AchievementCategory.CHECKIN)
                .tier(AchievementTier.BRONZE)
                .targetValue(1)
                .pointsReward(50)
                .active(true)
                .build();
    }

    @Test
    void getTouristAchievements_shouldCombineProgressAndDefaults() {
        Long userId = 100L;
        when(achievementRepository.findByActiveTrue()).thenReturn(List.of(tourAchievement, checkinAchievement));

        UserAchievement ua = UserAchievement.builder()
                .id(11L)
                .userId(userId)
                .achievement(tourAchievement)
                .currentProgress(1)
                .status(AchievementStatus.CLAIMABLE)
                .build();
        when(userAchievementRepository.findAllByUserIdWithAchievement(userId)).thenReturn(List.of(ua));

        Page<TouristAchievementResponse> result = achievementService.getTouristAchievements(
                userId, null, null, PageRequest.of(0, 10));

        assertNotNull(result);
        assertEquals(2, result.getTotalElements());

        // tourAchievement có progress = 1, status = CLAIMABLE
        TouristAchievementResponse r1 = result.getContent().stream()
                .filter(r -> r.id().equals(1L)).findFirst().orElseThrow();
        assertEquals(AchievementStatus.CLAIMABLE, r1.status());
        assertEquals(1, r1.currentProgress());

        // checkinAchievement chưa có UserAchievement -> mặc định progress = 0, status = LOCKED
        TouristAchievementResponse r2 = result.getContent().stream()
                .filter(r -> r.id().equals(2L)).findFirst().orElseThrow();
        assertEquals(AchievementStatus.LOCKED, r2.status());
        assertEquals(0, r2.currentProgress());
    }

    @Test
    void getTouristAchievements_shouldFilterByCategory() {
        Long userId = 100L;
        when(achievementRepository.findByActiveTrue()).thenReturn(List.of(tourAchievement, checkinAchievement));
        when(userAchievementRepository.findAllByUserIdWithAchievement(userId)).thenReturn(List.of());

        Page<TouristAchievementResponse> result = achievementService.getTouristAchievements(
                userId, AchievementCategory.TOUR, null, PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        assertEquals(AchievementCategory.TOUR, result.getContent().get(0).category());
    }

    @Test
    void getTouristAchievements_shouldFilterByStatus() {
        Long userId = 100L;
        when(achievementRepository.findByActiveTrue()).thenReturn(List.of(tourAchievement, checkinAchievement));

        UserAchievement ua = UserAchievement.builder()
                .id(11L)
                .userId(userId)
                .achievement(tourAchievement)
                .currentProgress(1)
                .status(AchievementStatus.CLAIMABLE)
                .build();
        when(userAchievementRepository.findAllByUserIdWithAchievement(userId)).thenReturn(List.of(ua));

        Page<TouristAchievementResponse> result = achievementService.getTouristAchievements(
                userId, null, AchievementStatus.CLAIMABLE, PageRequest.of(0, 10));

        assertEquals(1, result.getTotalElements());
        assertEquals(AchievementStatus.CLAIMABLE, result.getContent().get(0).status());
    }

    @Test
    void getTouristAchievementDetail_shouldReturnDetail_whenFound() {
        Long userId = 100L;
        when(achievementRepository.findById(1L)).thenReturn(Optional.of(tourAchievement));
        when(userAchievementRepository.findByUserIdAndAchievementIdWithDetails(userId, 1L))
                .thenReturn(Optional.of(UserAchievement.builder()
                        .userId(userId)
                        .achievement(tourAchievement)
                        .currentProgress(1)
                        .status(AchievementStatus.CLAIMABLE)
                        .build()));

        TouristAchievementResponse response = achievementService.getTouristAchievementDetail(userId, 1L);

        assertNotNull(response);
        assertEquals("FIRST_TOUR", response.code());
        assertEquals(AchievementStatus.CLAIMABLE, response.status());
    }

    @Test
    void getTouristAchievementDetail_shouldThrowNotFound_whenMissing() {
        Long userId = 100L;
        when(achievementRepository.findById(999L)).thenReturn(Optional.empty());

        AppException ex = assertThrows(AppException.class, () ->
                achievementService.getTouristAchievementDetail(userId, 999L));
        assertEquals(ErrorCode.ACHIEVEMENT_NOT_FOUND, ex.getErrorCode());
    }

    @Test
    void getTouristAchievementSummary_shouldReturnCorrectCounts() {
        Long userId = 100L;
        when(userAchievementRepository.countByUserIdAndStatus(userId, AchievementStatus.CLAIMABLE)).thenReturn(2L);
        when(userAchievementRepository.countByUserIdAndStatus(userId, AchievementStatus.CLAIMED)).thenReturn(5L);
        when(userAchievementRepository.sumClaimedPointsByUserId(userId)).thenReturn(1200L);

        TouristAchievementSummaryResponse summary = achievementService.getTouristAchievementSummary(userId);

        assertNotNull(summary);
        assertEquals(7L, summary.totalAchieved());
        assertEquals(2L, summary.unclaimedCount());
        assertEquals(5L, summary.totalClaimed());
        assertEquals(1200L, summary.totalPointsEarned());
    }

    @Test
    void claimReward_shouldSucceed_whenClaimable() {
        Long userId = 100L;
        UserAchievement ua = UserAchievement.builder()
                .id(20L)
                .userId(userId)
                .achievement(tourAchievement)
                .currentProgress(1)
                .status(AchievementStatus.CLAIMABLE)
                .build();

        when(userAchievementRepository.findByUserIdAndAchievementIdWithDetails(userId, 1L))
                .thenReturn(Optional.of(ua));
        when(userBadgeRepository.existsByUserIdAndBadgeId(userId, sampleBadge.getId())).thenReturn(false);

        UserPoint updatedPoint = UserPoint.builder()
                .userId(userId)
                .currentBalance(350)
                .lifetimeEarned(500)
                .build();
        when(gamificationService.awardPoints(
                eq(userId),
                eq(100),
                eq(PointTransactionType.EARNED_ACHIEVEMENT),
                eq("ACHIEVEMENT_1_U_100"),
                anyString()
        )).thenReturn(updatedPoint);

        ClaimAchievementResponse response = achievementService.claimReward(userId, 1L);

        assertNotNull(response);
        assertEquals(AchievementStatus.CLAIMED, response.status());
        assertEquals(100, response.pointsAwarded());
        assertEquals(350, response.newPointBalance());
        assertEquals("Nhà Khám Phá Tập Sự 🥉", response.badgeName());

        assertEquals(AchievementStatus.CLAIMED, ua.getStatus());
        assertNotNull(ua.getClaimedAt());
        verify(userAchievementRepository).save(ua);
        verify(userBadgeRepository).save(any(UserBadge.class));
    }

    @Test
    void claimReward_shouldThrowException_whenStatusIsLocked() {
        Long userId = 100L;
        UserAchievement ua = UserAchievement.builder()
                .id(20L)
                .userId(userId)
                .achievement(tourAchievement)
                .currentProgress(0)
                .status(AchievementStatus.LOCKED)
                .build();

        when(userAchievementRepository.findByUserIdAndAchievementIdWithDetails(userId, 1L))
                .thenReturn(Optional.of(ua));

        AppException ex = assertThrows(AppException.class, () ->
                achievementService.claimReward(userId, 1L));
        assertEquals(ErrorCode.ACHIEVEMENT_NOT_CLAIMABLE, ex.getErrorCode());
        verify(gamificationService, never()).awardPoints(any(), anyInt(), any(), any(), any());
    }

    @Test
    void claimReward_shouldThrowException_whenAlreadyClaimed() {
        Long userId = 100L;
        UserAchievement ua = UserAchievement.builder()
                .id(20L)
                .userId(userId)
                .achievement(tourAchievement)
                .currentProgress(1)
                .status(AchievementStatus.CLAIMED)
                .claimedAt(Instant.now())
                .build();

        when(userAchievementRepository.findByUserIdAndAchievementIdWithDetails(userId, 1L))
                .thenReturn(Optional.of(ua));

        AppException ex = assertThrows(AppException.class, () ->
                achievementService.claimReward(userId, 1L));
        assertEquals(ErrorCode.ACHIEVEMENT_NOT_CLAIMABLE, ex.getErrorCode());
        verify(gamificationService, never()).awardPoints(any(), anyInt(), any(), any(), any());
    }

    @Test
    void getAdminAchievements_shouldReturnAllWithCounts() {
        when(achievementRepository.findAll()).thenReturn(List.of(tourAchievement));
        when(userAchievementRepository.countByAchievementIdAndStatus(1L, AchievementStatus.CLAIMABLE)).thenReturn(3L);
        when(userAchievementRepository.countByAchievementIdAndStatus(1L, AchievementStatus.CLAIMED)).thenReturn(7L);

        Page<AdminAchievementResponse> result = achievementService.getAdminAchievements(null, null, PageRequest.of(0, 10));

        assertNotNull(result);
        assertEquals(1, result.getTotalElements());
        AdminAchievementResponse item = result.getContent().get(0);
        assertEquals("FIRST_TOUR", item.code());
        assertEquals(3L, item.achievedCount());
        assertEquals(7L, item.claimedCount());
    }

    @Test
    void createAchievement_shouldSave_whenCodeUnique() {
        AdminAchievementRequest req = new AdminAchievementRequest(
                "NEW_ACHIEVEMENT",
                "Thành tựu mới",
                "Mô tả",
                AchievementCategory.TOUR,
                AchievementTier.GOLD,
                5,
                200,
                "Huy hiệu vàng",
                "https://example.com/icon.png",
                null,
                true
        );

        when(achievementRepository.existsByCode("NEW_ACHIEVEMENT")).thenReturn(false);
        when(achievementRepository.save(any(Achievement.class))).thenAnswer(inv -> {
            Achievement a = inv.getArgument(0);
            a.setId(99L);
            return a;
        });

        AdminAchievementResponse res = achievementService.createAchievement(req);

        assertNotNull(res);
        assertEquals("NEW_ACHIEVEMENT", res.code());
        assertEquals(99L, res.id());
        verify(achievementRepository).save(any(Achievement.class));
    }

    @Test
    void createAchievement_shouldThrowException_whenCodeExists() {
        AdminAchievementRequest req = new AdminAchievementRequest(
                "FIRST_TOUR",
                "Bước Chân Đầu Tiên",
                "Mô tả",
                AchievementCategory.TOUR,
                AchievementTier.BRONZE,
                1,
                100,
                null,
                null,
                null,
                true
        );

        when(achievementRepository.existsByCode("FIRST_TOUR")).thenReturn(true);

        AppException ex = assertThrows(AppException.class, () -> achievementService.createAchievement(req));
        assertEquals(ErrorCode.ACHIEVEMENT_CODE_EXISTED, ex.getErrorCode());
        verify(achievementRepository, never()).save(any());
    }

    @Test
    void updateAchievement_shouldUpdateSuccessfully() {
        when(achievementRepository.findById(1L)).thenReturn(Optional.of(tourAchievement));
        when(achievementRepository.save(any(Achievement.class))).thenAnswer(inv -> inv.getArgument(0));

        AdminAchievementRequest req = new AdminAchievementRequest(
                "FIRST_TOUR",
                "Bước Chân Đầu Tiên (Updated)",
                "Mô tả mới",
                AchievementCategory.TOUR,
                AchievementTier.SILVER,
                2,
                150,
                null,
                null,
                null,
                true
        );

        AdminAchievementResponse res = achievementService.updateAchievement(1L, req);

        assertNotNull(res);
        assertEquals("Bước Chân Đầu Tiên (Updated)", res.name());
        assertEquals(AchievementTier.SILVER, res.tier());
        assertEquals(150, res.pointsReward());
        verify(achievementRepository).save(any(Achievement.class));
    }

    @Test
    void deactivateAchievement_shouldSetIsActiveFalse() {
        when(achievementRepository.findById(1L)).thenReturn(Optional.of(tourAchievement));
        when(achievementRepository.save(any(Achievement.class))).thenAnswer(inv -> inv.getArgument(0));

        AdminAchievementResponse res = achievementService.deactivateAchievement(1L);

        assertNotNull(res);
        assertFalse(res.active());
        assertFalse(tourAchievement.isActive());
        verify(achievementRepository).save(tourAchievement);
    }
}
