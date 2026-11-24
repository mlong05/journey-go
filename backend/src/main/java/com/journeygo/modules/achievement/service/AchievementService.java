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
import com.journeygo.modules.gamification.repository.BadgeRepository;
import com.journeygo.modules.gamification.repository.UserBadgeRepository;
import com.journeygo.modules.gamification.service.GamificationService;
import com.journeygo.modules.notification.entity.enums.NotificationType;
import com.journeygo.modules.notification.service.NotificationPublisher;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Collections;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AchievementService {

    private final AchievementRepository achievementRepository;
    private final UserAchievementRepository userAchievementRepository;
    private final GamificationService gamificationService;
    private final UserBadgeRepository userBadgeRepository;
    private final BadgeRepository badgeRepository;
    private final NotificationPublisher notifications;

    /**
     * Lấy danh sách thành tựu cho Tourist, kết hợp tiến độ cá nhân.
     */
    @Transactional(readOnly = true)
    public Page<TouristAchievementResponse> getTouristAchievements(
            Long userId,
            AchievementCategory category,
            AchievementStatus statusFilter,
            Pageable pageable
    ) {
        List<Achievement> activeAchievements = achievementRepository.findByActiveTrue();
        if (category != null) {
            activeAchievements = activeAchievements.stream()
                    .filter(a -> a.getCategory() == category)
                    .toList();
        }

        Map<Long, UserAchievement> userMap = userAchievementRepository.findAllByUserIdWithAchievement(userId)
                .stream()
                .collect(Collectors.toMap(ua -> ua.getAchievement().getId(), ua -> ua, (existing, replacement) -> existing));

        List<TouristAchievementResponse> allResponses = activeAchievements.stream()
                .map(a -> TouristAchievementResponse.from(a, userMap.get(a.getId())))
                .filter(res -> statusFilter == null || res.status() == statusFilter)
                .toList();

        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), allResponses.size());
        List<TouristAchievementResponse> pageContent = (start <= allResponses.size())
                ? allResponses.subList(start, end)
                : Collections.emptyList();

        return new PageImpl<>(pageContent, pageable, allResponses.size());
    }

    /**
     * Xem chi tiết một thành tựu kèm tiến độ của Tourist.
     */
    @Transactional(readOnly = true)
    public TouristAchievementResponse getTouristAchievementDetail(Long userId, Long achievementId) {
        Achievement achievement = achievementRepository.findById(achievementId)
                .filter(Achievement::isActive)
                .orElseThrow(() -> new AppException(ErrorCode.ACHIEVEMENT_NOT_FOUND));

        UserAchievement ua = userAchievementRepository.findByUserIdAndAchievementIdWithDetails(userId, achievementId)
                .orElse(null);

        return TouristAchievementResponse.from(achievement, ua);
    }

    /**
     * Thống kê tổng quan thành tựu của Tourist: tổng đạt, chờ nhận (red dot), đã nhận, điểm đã nhận.
     */
    @Transactional(readOnly = true)
    public TouristAchievementSummaryResponse getTouristAchievementSummary(Long userId) {
        long unclaimedCount = userAchievementRepository.countByUserIdAndStatus(userId, AchievementStatus.CLAIMABLE);
        long claimedCount = userAchievementRepository.countByUserIdAndStatus(userId, AchievementStatus.CLAIMED);
        long totalAchieved = unclaimedCount + claimedCount;
        long totalPoints = userAchievementRepository.sumClaimedPointsByUserId(userId);

        return TouristAchievementSummaryResponse.builder()
                .totalAchieved(totalAchieved)
                .unclaimedCount(unclaimedCount)
                .totalClaimed(claimedCount)
                .totalPointsEarned(totalPoints)
                .build();
    }

    /**
     * Nhận thưởng thành tựu (Claim): cộng điểm + cấp huy hiệu + thông báo.
     * Đảm bảo concurrency-safe và idempotent trong transaction.
     */
    @Transactional
    public ClaimAchievementResponse claimReward(Long userId, Long achievementId) {
        UserAchievement ua = userAchievementRepository.findByUserIdAndAchievementIdWithDetails(userId, achievementId)
                .orElseThrow(() -> new AppException(ErrorCode.ACHIEVEMENT_NOT_CLAIMABLE));

        if (ua.getStatus() != AchievementStatus.CLAIMABLE) {
            throw new AppException(ErrorCode.ACHIEVEMENT_NOT_CLAIMABLE);
        }

        Achievement achievement = ua.getAchievement();

        ua.setStatus(AchievementStatus.CLAIMED);
        ua.setClaimedAt(Instant.now());
        userAchievementRepository.save(ua);

        String refId = "ACHIEVEMENT_" + achievement.getId() + "_U_" + userId;
        UserPoint userPoint = gamificationService.awardPoints(
                userId,
                achievement.getPointsReward(),
                PointTransactionType.EARNED_ACHIEVEMENT,
                refId,
                "Thưởng hoàn thành thành tựu: " + achievement.getName()
        );

        Badge badge = achievement.getBadge();
        Long awardedBadgeId = null;
        String badgeName = achievement.getBadgeName();
        String badgeIcon = achievement.getBadgeIcon();

        if (badge != null) {
            awardedBadgeId = badge.getId();
            badgeName = badge.getName();
            badgeIcon = badge.getIconUrl();
            if (!userBadgeRepository.existsByUserIdAndBadgeId(userId, badge.getId())) {
                UserBadge userBadge = UserBadge.builder()
                        .userId(userId)
                        .badge(badge)
                        .earnedAt(Instant.now())
                        .build();
                userBadgeRepository.save(userBadge);
            }
        }

        notifications.send(NotificationType.ACHIEVEMENT_UNLOCKED)
                .to(userId)
                .title("Đã nhận thưởng thành tựu!")
                .body("Bạn đã nhận " + achievement.getPointsReward() + " điểm cho thành tựu "
                        + NotificationPublisher.quote(achievement.getName()))
                .ref("ACHIEVEMENT", achievement.getId())
                .publish();

        log.info("Du khách {} đã nhận thưởng thành tựu #{}-{} (+{} điểm)",
                userId, achievement.getId(), achievement.getCode(), achievement.getPointsReward());

        return ClaimAchievementResponse.builder()
                .achievementId(achievement.getId())
                .achievementCode(achievement.getCode())
                .achievementName(achievement.getName())
                .status(AchievementStatus.CLAIMED)
                .pointsAwarded(achievement.getPointsReward())
                .newPointBalance(userPoint != null ? userPoint.getCurrentBalance() : 0)
                .badgeName(badgeName)
                .badgeIcon(badgeIcon)
                .badgeId(awardedBadgeId)
                .claimedAt(ua.getClaimedAt())
                .build();
    }

    // ── ADMIN OPERATIONS ────────────────────────────────────────────────────────

    /**
     * Quản trị: xem danh sách thành tựu kèm số người đã đạt/đã nhận.
     */
    @Transactional(readOnly = true)
    public Page<AdminAchievementResponse> getAdminAchievements(
            AchievementCategory category,
            Boolean active,
            Pageable pageable
    ) {
        List<Achievement> all = achievementRepository.findAll();
        if (category != null) {
            all = all.stream().filter(a -> a.getCategory() == category).toList();
        }
        if (active != null) {
            all = all.stream().filter(a -> a.isActive() == active).toList();
        }

        List<AdminAchievementResponse> list = all.stream()
                .sorted(Comparator.comparing(Achievement::getId, Comparator.nullsLast(Long::compareTo)))
                .map(a -> {
                    long achievedCount = userAchievementRepository.countByAchievementIdAndStatus(a.getId(), AchievementStatus.CLAIMABLE);
                    long claimedCount = userAchievementRepository.countByAchievementIdAndStatus(a.getId(), AchievementStatus.CLAIMED);
                    return AdminAchievementResponse.from(a, achievedCount, claimedCount);
                })
                .toList();

        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), list.size());
        List<AdminAchievementResponse> pageContent = (start <= list.size())
                ? list.subList(start, end)
                : Collections.emptyList();

        return new PageImpl<>(pageContent, pageable, list.size());
    }

    /**
     * Quản trị: xem chi tiết một thành tựu kèm thống kê.
     */
    @Transactional(readOnly = true)
    public AdminAchievementResponse getAdminAchievementDetail(Long achievementId) {
        Achievement a = achievementRepository.findById(achievementId)
                .orElseThrow(() -> new AppException(ErrorCode.ACHIEVEMENT_NOT_FOUND));

        long achievedCount = userAchievementRepository.countByAchievementIdAndStatus(a.getId(), AchievementStatus.CLAIMABLE);
        long claimedCount = userAchievementRepository.countByAchievementIdAndStatus(a.getId(), AchievementStatus.CLAIMED);
        return AdminAchievementResponse.from(a, achievedCount, claimedCount);
    }

    /**
     * Quản trị: tạo mới một thành tựu.
     */
    @Transactional
    public AdminAchievementResponse createAchievement(AdminAchievementRequest request) {
        String code = request.code().trim().toUpperCase();
        if (achievementRepository.existsByCode(code)) {
            throw new AppException(ErrorCode.ACHIEVEMENT_CODE_EXISTED);
        }

        Badge badge = null;
        if (request.badgeId() != null) {
            badge = badgeRepository.findById(request.badgeId()).orElse(null);
        }

        Achievement achievement = Achievement.builder()
                .code(code)
                .name(request.name().trim())
                .description(request.description().trim())
                .category(request.category())
                .tier(request.tier())
                .targetValue(request.targetValue())
                .pointsReward(request.pointsReward())
                .badgeName(request.badgeName() != null ? request.badgeName().trim() : (badge != null ? badge.getName() : null))
                .badgeIcon(request.badgeIcon() != null ? request.badgeIcon().trim() : (badge != null ? badge.getIconUrl() : null))
                .badge(badge)
                .active(request.active() == null || request.active())
                .build();

        Achievement saved = achievementRepository.save(achievement);
        log.info("Quản trị viên đã tạo mới thành tựu #{}-{}", saved.getId(), saved.getCode());
        return AdminAchievementResponse.from(saved, 0L, 0L);
    }

    /**
     * Quản trị: cập nhật cấu hình thành tựu.
     */
    @Transactional
    public AdminAchievementResponse updateAchievement(Long achievementId, AdminAchievementRequest request) {
        Achievement a = achievementRepository.findById(achievementId)
                .orElseThrow(() -> new AppException(ErrorCode.ACHIEVEMENT_NOT_FOUND));

        String newCode = request.code() != null ? request.code().trim().toUpperCase() : a.getCode();
        if (!a.getCode().equals(newCode)) {
            if (userAchievementRepository.existsByAchievementId(achievementId)) {
                throw new AppException(ErrorCode.VALIDATION_ERROR);
            }
            if (achievementRepository.existsByCode(newCode)) {
                throw new AppException(ErrorCode.ACHIEVEMENT_CODE_EXISTED);
            }
            a.setCode(newCode);
        }

        if (request.badgeId() != null) {
            if (request.badgeId() <= 0) {
                a.setBadge(null);
            } else {
                Badge badge = badgeRepository.findById(request.badgeId()).orElse(null);
                a.setBadge(badge);
            }
        }

        a.setName(request.name().trim());
        a.setDescription(request.description().trim());
        a.setCategory(request.category());
        a.setTier(request.tier());
        a.setTargetValue(request.targetValue());
        a.setPointsReward(request.pointsReward());
        if (request.badgeName() != null) {
            String trimmedName = request.badgeName().trim();
            a.setBadgeName(trimmedName.isEmpty() ? null : trimmedName);
        }
        if (request.badgeIcon() != null) {
            String trimmedIcon = request.badgeIcon().trim();
            a.setBadgeIcon(trimmedIcon.isEmpty() ? null : trimmedIcon);
        }
        if (request.active() != null) a.setActive(request.active());

        Achievement saved = achievementRepository.save(a);
        long achievedCount = userAchievementRepository.countByAchievementIdAndStatus(a.getId(), AchievementStatus.CLAIMABLE);
        long claimedCount = userAchievementRepository.countByAchievementIdAndStatus(a.getId(), AchievementStatus.CLAIMED);
        log.info("Quản trị viên đã cập nhật thành tựu #{}-{}", saved.getId(), saved.getCode());
        return AdminAchievementResponse.from(saved, achievedCount, claimedCount);
    }

    /**
     * Quản trị: vô hiệu hóa (deactivate) thành tựu để bảo toàn lịch sử tiến độ của du khách.
     */
    @Transactional
    public AdminAchievementResponse deactivateAchievement(Long achievementId) {
        Achievement a = achievementRepository.findById(achievementId)
                .orElseThrow(() -> new AppException(ErrorCode.ACHIEVEMENT_NOT_FOUND));

        a.setActive(false);
        Achievement saved = achievementRepository.save(a);

        long achievedCount = userAchievementRepository.countByAchievementIdAndStatus(a.getId(), AchievementStatus.CLAIMABLE);
        long claimedCount = userAchievementRepository.countByAchievementIdAndStatus(a.getId(), AchievementStatus.CLAIMED);
        log.info("Quản trị viên đã vô hiệu hóa thành tựu #{}-{}", saved.getId(), saved.getCode());
        return AdminAchievementResponse.from(saved, achievedCount, claimedCount);
    }
}
