package com.journeygo.modules.achievement.service;

import com.journeygo.modules.achievement.entity.Achievement;
import com.journeygo.modules.achievement.entity.UserAchievement;
import com.journeygo.modules.achievement.entity.enums.AchievementCategory;
import com.journeygo.modules.achievement.entity.enums.AchievementStatus;
import com.journeygo.modules.achievement.entity.enums.AchievementTier;
import com.journeygo.modules.achievement.repository.AchievementRepository;
import com.journeygo.modules.achievement.repository.UserAchievementRepository;
import com.journeygo.modules.notification.service.NotificationPublisher;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.Spy;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.context.ApplicationEventPublisher;

import java.time.Instant;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AchievementProgressServiceTest {

    @Mock
    private AchievementRepository achievementRepository;

    @Mock
    private UserAchievementRepository userAchievementRepository;

    @Spy
    private NotificationPublisher notifications =
            new NotificationPublisher(mock(ApplicationEventPublisher.class));

    @InjectMocks
    private AchievementProgressService progressService;

    private Achievement tenToursAchievement;

    @BeforeEach
    void setUp() {
        tenToursAchievement = Achievement.builder()
                .id(2L)
                .code("TEN_TOURS")
                .name("Người Du Lịch Chăm Chỉ")
                .description("Hoàn thành 10 tour khác nhau")
                .category(AchievementCategory.TOUR)
                .tier(AchievementTier.SILVER)
                .targetValue(10)
                .pointsReward(500)
                .active(true)
                .build();
    }

    @Test
    void updateProgress_shouldUpdateProgressWithoutUnlocking_whenBelowTarget() {
        Long userId = 100L;
        when(achievementRepository.findByCode("TEN_TOURS")).thenReturn(Optional.of(tenToursAchievement));

        UserAchievement ua = UserAchievement.builder()
                .id(1L)
                .userId(userId)
                .achievement(tenToursAchievement)
                .currentProgress(5)
                .status(AchievementStatus.LOCKED)
                .build();
        when(userAchievementRepository.findByUserIdAndAchievementCode(userId, "TEN_TOURS"))
                .thenReturn(Optional.of(ua));

        progressService.updateProgress(userId, "TEN_TOURS", 7);

        assertEquals(7, ua.getCurrentProgress());
        assertEquals(AchievementStatus.LOCKED, ua.getStatus());
        assertNull(ua.getAchievedAt());
        verify(userAchievementRepository).save(ua);
    }

    @Test
    void updateProgress_shouldUnlockAndSetClaimable_whenTargetReached() {
        Long userId = 100L;
        when(achievementRepository.findByCode("TEN_TOURS")).thenReturn(Optional.of(tenToursAchievement));

        UserAchievement ua = UserAchievement.builder()
                .id(1L)
                .userId(userId)
                .achievement(tenToursAchievement)
                .currentProgress(9)
                .status(AchievementStatus.LOCKED)
                .build();
        when(userAchievementRepository.findByUserIdAndAchievementCode(userId, "TEN_TOURS"))
                .thenReturn(Optional.of(ua));

        progressService.updateProgress(userId, "TEN_TOURS", 10);

        assertEquals(10, ua.getCurrentProgress());
        assertEquals(AchievementStatus.CLAIMABLE, ua.getStatus());
        assertNotNull(ua.getAchievedAt());
        verify(userAchievementRepository).save(ua);
    }

    @Test
    void updateProgress_shouldDoNothing_whenAlreadyClaimed() {
        Long userId = 100L;
        when(achievementRepository.findByCode("TEN_TOURS")).thenReturn(Optional.of(tenToursAchievement));

        UserAchievement ua = UserAchievement.builder()
                .id(1L)
                .userId(userId)
                .achievement(tenToursAchievement)
                .currentProgress(10)
                .status(AchievementStatus.CLAIMED)
                .claimedAt(Instant.now())
                .build();
        when(userAchievementRepository.findByUserIdAndAchievementCode(userId, "TEN_TOURS"))
                .thenReturn(Optional.of(ua));

        progressService.updateProgress(userId, "TEN_TOURS", 12);

        assertEquals(10, ua.getCurrentProgress());
        assertEquals(AchievementStatus.CLAIMED, ua.getStatus());
        verify(userAchievementRepository, never()).save(ua);
    }

    @Test
    void incrementProgress_shouldAddDelta() {
        Long userId = 100L;
        when(achievementRepository.findByCode("TEN_TOURS")).thenReturn(Optional.of(tenToursAchievement));

        UserAchievement ua = UserAchievement.builder()
                .id(1L)
                .userId(userId)
                .achievement(tenToursAchievement)
                .currentProgress(2)
                .status(AchievementStatus.LOCKED)
                .build();
        when(userAchievementRepository.findByUserIdAndAchievementCode(userId, "TEN_TOURS"))
                .thenReturn(Optional.of(ua));

        progressService.incrementProgress(userId, "TEN_TOURS", 3);

        assertEquals(5, ua.getCurrentProgress());
        assertEquals(AchievementStatus.LOCKED, ua.getStatus());
        verify(userAchievementRepository).save(ua);
    }

    @Test
    void resetProgress_shouldResetToZero_whenLocked() {
        Long userId = 100L;
        UserAchievement ua = UserAchievement.builder()
                .id(1L)
                .userId(userId)
                .achievement(tenToursAchievement)
                .currentProgress(4)
                .status(AchievementStatus.LOCKED)
                .build();
        when(userAchievementRepository.findByUserIdAndAchievementCode(userId, "TEN_TOURS"))
                .thenReturn(Optional.of(ua));

        progressService.resetProgress(userId, "TEN_TOURS");

        assertEquals(0, ua.getCurrentProgress());
        verify(userAchievementRepository).save(ua);
    }
}

