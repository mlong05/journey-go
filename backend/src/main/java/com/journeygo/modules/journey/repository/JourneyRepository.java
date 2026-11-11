package com.journeygo.modules.journey.repository;

import com.journeygo.modules.journey.entity.Journey;
import com.journeygo.modules.journey.entity.enums.JourneyStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JourneyRepository extends JpaRepository<Journey, Long> {

    List<Journey> findByUserIdOrderByCreatedAtDesc(Long userId);

    List<Journey> findByUserIdAndStatus(Long userId, JourneyStatus status);

    /** Du khách đã từng bắt đầu hành trình của tour (dùng để đánh dấu bài viết cộng đồng đáng tin). */
    boolean existsByUserIdAndTourId(Long userId, Long tourId);

    Optional<Journey> findByUserIdAndBookingId(Long userId, Long bookingId);

    Optional<Journey> findFirstByUserIdAndBookingIdOrderByCreatedAtDesc(Long userId, Long bookingId);

    Optional<Journey> findFirstByUserIdAndTourIdAndStatusInOrderByCreatedAtDesc(
            Long userId, Long tourId, List<JourneyStatus> statuses
    );

    @Query("SELECT j FROM Journey j LEFT JOIN FETCH j.destinations WHERE j.id = :id")
    Optional<Journey> findByIdWithDestinations(@Param("id") Long id);

    @Query("SELECT j FROM Journey j LEFT JOIN FETCH j.destinations WHERE j.id = :id AND j.userId = :userId")
    Optional<Journey> findByIdAndUserIdWithDestinations(@Param("id") Long id, @Param("userId") Long userId);
}
