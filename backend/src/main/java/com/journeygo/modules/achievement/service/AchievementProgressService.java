package com.journeygo.modules.achievement.service;

import com.journeygo.modules.achievement.entity.Achievement;
import com.journeygo.modules.achievement.entity.UserAchievement;
import com.journeygo.modules.achievement.entity.enums.AchievementStatus;
import com.journeygo.modules.achievement.repository.AchievementRepository;
import com.journeygo.modules.achievement.repository.UserAchievementRepository;
import com.journeygo.modules.notification.entity.enums.NotificationType;
import com.journeygo.modules.notification.service.NotificationPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AchievementProgressService {

    private final AchievementRepository achievementRepository;
    private final UserAchievementRepository userAchievementRepository;
    private final NotificationPublisher notifications;

    /**
     * Cập nhật tiến độ của một thành tựu cụ thể theo code.
     * Tự động chuyển sang CLAIMABLE khi đạt targetValue và gửi thông báo cho du khách.
     */
    @Transactional
    public void updateProgress(Long userId, String achievementCode, int newProgress) {
        if (userId == null || achievementCode == null) return;

        Optional<Achievement> optAch = achievementRepository.findByCode(achievementCode);
        if (optAch.isEmpty()) {
            log.debug("Thành tựu {} không tồn tại trong hệ thống", achievementCode);
            return;
        }

        Achievement achievement = optAch.get();
        if (!achievement.isActive()) return;

        UserAchievement ua = userAchievementRepository.findByUserIdAndAchievementCode(userId, achievementCode)
                .orElseGet(() -> UserAchievement.builder()
                        .userId(userId)
                        .achievement(achievement)
                        .currentProgress(0)
                        .status(AchievementStatus.LOCKED)
                        .build());

        // Nếu đã nhận thưởng, không cập nhật lại
        if (ua.getStatus() == AchievementStatus.CLAIMED) {
            return;
        }

        // Cập nhật tiến độ nếu giá trị mới lớn hơn
        if (newProgress > ua.getCurrentProgress()) {
            ua.setCurrentProgress(newProgress);
        }

        // Kiểm tra xem đã đạt điều kiện mở khóa chưa
        if (ua.getCurrentProgress() >= achievement.getTargetValue() && ua.getStatus() == AchievementStatus.LOCKED) {
            ua.setStatus(AchievementStatus.CLAIMABLE);
            ua.setAchievedAt(Instant.now());
            log.info("Du khách {} đã mở khóa thành tựu #{}-{} ({}/{})",
                    userId, achievement.getId(), achievement.getCode(), ua.getCurrentProgress(), achievement.getTargetValue());

            notifications.send(NotificationType.ACHIEVEMENT_UNLOCKED)
                    .to(userId)
                    .title("Thành tựu mới sẵn sàng nhận thưởng! 🎉")
                    .body("Bạn đã hoàn thành thành tựu " + NotificationPublisher.quote(achievement.getName())
                            + ". Hãy vào mục Thành tựu để nhận " + achievement.getPointsReward() + " điểm thưởng!")
                    .ref("ACHIEVEMENT", achievement.getId())
                    .publish();
        }

        userAchievementRepository.save(ua);
    }

    /**
     * Tăng thêm tiến độ tương đối (+delta).
     */
    @Transactional
    public void incrementProgress(Long userId, String achievementCode, int delta) {
        if (userId == null || achievementCode == null || delta <= 0) return;

        Optional<Achievement> optAch = achievementRepository.findByCode(achievementCode);
        if (optAch.isEmpty()) return;

        Achievement achievement = optAch.get();
        if (!achievement.isActive()) return;

        UserAchievement ua = userAchievementRepository.findByUserIdAndAchievementCode(userId, achievementCode)
                .orElseGet(() -> UserAchievement.builder()
                        .userId(userId)
                        .achievement(achievement)
                        .currentProgress(0)
                        .status(AchievementStatus.LOCKED)
                        .build());

        if (ua.getStatus() == AchievementStatus.CLAIMED) {
            return;
        }

        int newProgress = ua.getCurrentProgress() + delta;
        updateProgress(userId, achievementCode, newProgress);
    }

    /**
     * Đặt lại tiến độ về 0 (dùng cho chuỗi liên tiếp khi thất bại).
     */
    @Transactional
    public void resetProgress(Long userId, String achievementCode) {
        if (userId == null || achievementCode == null) return;

        UserAchievement ua = userAchievementRepository.findByUserIdAndAchievementCode(userId, achievementCode)
                .orElse(null);

        if (ua != null && ua.getStatus() == AchievementStatus.LOCKED) {
            ua.setCurrentProgress(0);
            userAchievementRepository.save(ua);
        }
    }
}

