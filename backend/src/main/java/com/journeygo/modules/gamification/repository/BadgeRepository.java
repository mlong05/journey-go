package com.journeygo.modules.gamification.repository;

import com.journeygo.modules.gamification.entity.Badge;
import com.journeygo.modules.gamification.entity.enums.BadgeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BadgeRepository extends JpaRepository<Badge, Long> {

    Optional<Badge> findByCode(String code);

    Optional<Badge> findByDestinationIdAndActiveTrue(Long destinationId);

    List<Badge> findByActiveTrue();

    List<Badge> findByBadgeTypeAndActiveTrue(BadgeType badgeType);
}
