package com.journeygo.modules.gamification.repository;

import com.journeygo.modules.gamification.entity.UserPoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserPointRepository extends JpaRepository<UserPoint, Long> {

    Optional<UserPoint> findByUserId(Long userId);

    boolean existsByUserId(Long userId);
}
