package com.journeygo.modules.gamification.repository;

import com.journeygo.modules.gamification.entity.Badge;
import com.journeygo.modules.gamification.entity.enums.BadgeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Repository
public interface BadgeRepository extends JpaRepository<Badge, Long> {

    Optional<Badge> findByCode(String code);

    Optional<Badge> findByDestinationIdAndActiveTrue(Long destinationId);

    List<Badge> findByActiveTrue();

    List<Badge> findByBadgeTypeAndActiveTrue(BadgeType badgeType);

    /** Gỡ các đường dẫn ảnh không tồn tại (vd. bản cũ gán assets.journeygo.com) để app hiện biểu tượng mặc định. */
    @Modifying
    @Transactional
    @Query("UPDATE Badge b SET b.iconUrl = NULL WHERE b.iconUrl LIKE :prefix")
    int clearIconUrlsStartingWith(@Param("prefix") String prefix);
}
