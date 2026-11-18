package com.journeygo.modules.achievement.repository;

import com.journeygo.modules.achievement.entity.UserAchievement;
import com.journeygo.modules.achievement.entity.enums.AchievementCategory;
import com.journeygo.modules.achievement.entity.enums.AchievementStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface UserAchievementRepository extends JpaRepository<UserAchievement, Long> {

    @Query("SELECT ua FROM UserAchievement ua JOIN FETCH ua.achievement a LEFT JOIN FETCH a.badge WHERE ua.userId = :userId AND ua.achievement.id = :achievementId")
    Optional<UserAchievement> findByUserIdAndAchievementIdWithDetails(@Param("userId") Long userId, @Param("achievementId") Long achievementId);

    Optional<UserAchievement> findByUserIdAndAchievementId(Long userId, Long achievementId);

    @Query("SELECT ua FROM UserAchievement ua JOIN FETCH ua.achievement a WHERE ua.userId = :userId AND a.code = :code")
    Optional<UserAchievement> findByUserIdAndAchievementCode(@Param("userId") Long userId, @Param("code") String code);

    @Query("SELECT ua FROM UserAchievement ua JOIN FETCH ua.achievement a WHERE ua.userId = :userId")
    List<UserAchievement> findAllByUserIdWithAchievement(@Param("userId") Long userId);

    @Query("SELECT ua FROM UserAchievement ua JOIN FETCH ua.achievement a WHERE ua.userId = :userId AND ua.status = :status")
    List<UserAchievement> findAllByUserIdAndStatusWithAchievement(@Param("userId") Long userId, @Param("status") AchievementStatus status);

    long countByUserIdAndStatus(Long userId, AchievementStatus status);

    long countByUserIdAndStatusIn(Long userId, Collection<AchievementStatus> statuses);

    long countByAchievementIdAndStatus(Long achievementId, AchievementStatus status);

    boolean existsByAchievementId(Long achievementId);

    @Query("SELECT COALESCE(SUM(a.pointsReward), 0) FROM UserAchievement ua JOIN ua.achievement a WHERE ua.userId = :userId AND ua.status = 'CLAIMED'")
    long sumClaimedPointsByUserId(@Param("userId") Long userId);
}
