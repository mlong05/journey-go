package com.journeygo.modules.gamification.repository;

import com.journeygo.modules.gamification.entity.UserBadge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserBadgeRepository extends JpaRepository<UserBadge, Long> {

    @Query("SELECT ub FROM UserBadge ub JOIN FETCH ub.badge WHERE ub.userId = :userId ORDER BY ub.earnedAt DESC")
    List<UserBadge> findByUserIdWithBadge(@Param("userId") Long userId);

    boolean existsByUserIdAndBadgeId(Long userId, Long badgeId);

    Optional<UserBadge> findByUserIdAndBadgeId(Long userId, Long badgeId);

    Optional<UserBadge> findByUserIdAndDestinationId(Long userId, Long destinationId);
}
