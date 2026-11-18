package com.journeygo.modules.achievement.service;

import com.journeygo.modules.achievement.event.*;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.context.event.EventListener;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;

@Slf4j
@Component
@RequiredArgsConstructor
public class AchievementEventListener {

    private final AchievementProgressService progressService;

    @EventListener
    public void onTourCompleted(TourCompletedEvent event) {
        log.info("Xử lý event TourCompleted cho du khách {}", event.userId());
        progressService.incrementProgress(event.userId(), "FIRST_TOUR", 1);
        progressService.incrementProgress(event.userId(), "TEN_TOURS", 1);
        progressService.incrementProgress(event.userId(), "HUNDRED_TOURS", 1);
        if (event.destinationIds() != null && !event.destinationIds().isEmpty()) {
            progressService.incrementProgress(event.userId(), "FIVE_DESTINATIONS", 1);
        }
        // Streak khám phá: mỗi hoạt động hoàn thành tour ghi nhận chuỗi hoạt động
        progressService.incrementProgress(event.userId(), "THREE_DAY_STREAK", 1);
        progressService.incrementProgress(event.userId(), "SEVEN_DAY_STREAK", 1);
        progressService.incrementProgress(event.userId(), "THIRTY_DAY_STREAK", 1);
    }

    @EventListener
    public void onDestinationCheckedIn(DestinationCheckedInEvent event) {
        log.info("Xử lý event DestinationCheckedIn cho du khách {}", event.userId());
        progressService.incrementProgress(event.userId(), "FIRST_CHECKIN", 1);
        progressService.incrementProgress(event.userId(), "TWENTY_CHECKINS", 1);

        if (event.isEarlyBird()) {
            progressService.updateProgress(event.userId(), "EARLY_BIRD_CHECKIN", 1);
        }

        if (event.hasSpecialExperience()) {
            progressService.incrementProgress(event.userId(), "FIVE_SPECIAL_EXPERIENCES", 1);
        }

        progressService.incrementProgress(event.userId(), "THREE_DAY_STREAK", 1);
        progressService.incrementProgress(event.userId(), "SEVEN_DAY_STREAK", 1);
        progressService.incrementProgress(event.userId(), "THIRTY_DAY_STREAK", 1);
    }

    @EventListener
    public void onTaskCompleted(TaskCompletedEvent event) {
        log.info("Xử lý event TaskCompleted cho du khách {}: success={}", event.userId(), event.isSuccess());
        if (event.isSuccess()) {
            progressService.incrementProgress(event.userId(), "FIVE_EXPERIENCE_TASKS", 1);
            progressService.incrementProgress(event.userId(), "TWENTY_EXPERIENCE_TASKS", 1);
            progressService.incrementProgress(event.userId(), "FIVE_SUCCESSIVE_EXPERIENCES", 1);

            if (event.isPerfectScore()) {
                progressService.updateProgress(event.userId(), "PERFECT_QUIZ", 1);
            }

            if (event.scorePercentage() >= 80.0) {
                progressService.incrementProgress(event.userId(), "TEN_QUIZZES_80_PERCENT", 1);
            }

            if (event.hasSpecialReward()) {
                progressService.updateProgress(event.userId(), "SPECIAL_REWARD_EXPERIENCE", 1);
            }
        } else {
            // Khi làm nhiệm vụ trải nghiệm thất bại, reset chuỗi liên tiếp về 0
            progressService.resetProgress(event.userId(), "FIVE_SUCCESSIVE_EXPERIENCES");
        }
    }

    @EventListener
    public void onCulturalContentExplored(CulturalContentExploredEvent event) {
        log.info("Xử lý event CulturalContentExplored cho du khách {}", event.userId());
        progressService.incrementProgress(event.userId(), "READ_TEN_CULTURAL_CONTENTS", 1);
        progressService.incrementProgress(event.userId(), "FIVE_HERITAGE_DESTINATIONS", 1);
    }

    @EventListener
    public void onPointsEarned(PointsEarnedEvent event) {
        log.info("Xử lý event PointsEarned cho du khách {}: lifetime={}", event.userId(), event.lifetimeEarned());
        progressService.updateProgress(event.userId(), "TEN_THOUSAND_POINTS_EARNED", event.lifetimeEarned());
    }
}

