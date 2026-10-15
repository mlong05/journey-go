package com.journeygo.modules.experience.repository;

import com.journeygo.modules.experience.entity.UserCheckInPoint;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface UserCheckInPointRepository extends JpaRepository<UserCheckInPoint, Long> {

    Optional<UserCheckInPoint> findByUserIdAndCheckInPointId(Long userId, Long checkInPointId);

    List<UserCheckInPoint> findByUserIdOrderByCheckedInAtDesc(Long userId);

    List<UserCheckInPoint> findByUserIdAndExperienceIdOrderByCheckedInAtDesc(Long userId, Long experienceId);
}
