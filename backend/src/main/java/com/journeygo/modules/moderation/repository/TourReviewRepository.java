package com.journeygo.modules.moderation.repository;

import com.journeygo.modules.moderation.entity.TourReview;
import com.journeygo.modules.moderation.entity.enums.TourReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface TourReviewRepository extends JpaRepository<TourReview, Long> {
    Page<TourReview> findByStatusAndTour_DeletedFalse(TourReviewStatus status, Pageable pageable);
    Optional<TourReview> findByTour_TourId(Long tourId);
}
