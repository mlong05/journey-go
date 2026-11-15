package com.journeygo.modules.achievement.repository;

import com.journeygo.modules.achievement.entity.Achievement;
import com.journeygo.modules.achievement.entity.enums.AchievementCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface AchievementRepository extends JpaRepository<Achievement, Long>, JpaSpecificationExecutor<Achievement> {

    Optional<Achievement> findByCode(String code);

    boolean existsByCode(String code);

    List<Achievement> findByActiveTrue();

    Page<Achievement> findByActiveTrue(Pageable pageable);

    Page<Achievement> findByActiveTrueAndCategory(AchievementCategory category, Pageable pageable);
}

