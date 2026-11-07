package com.journeygo.modules.moderation.repository;

import com.journeygo.modules.moderation.entity.TourReview;
import com.journeygo.modules.moderation.entity.enums.TourReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

/** Một tour có nhiều lần gửi duyệt; lần mới nhất (id lớn nhất) là lần hiện hành. */
public interface TourReviewRepository extends JpaRepository<TourReview, Long> {
    Page<TourReview> findByStatusAndTour_DeletedFalse(TourReviewStatus status, Pageable pageable);

    Optional<TourReview> findFirstByTour_TourIdOrderByIdDesc(Long tourId);

    List<TourReview> findByTour_TourIdOrderByIdDesc(Long tourId);

    boolean existsByTour_TourIdAndStatus(Long tourId, TourReviewStatus status);

    /** Lần gửi duyệt hiện hành của tour. */
    default Optional<TourReview> findByTour_TourId(Long tourId) {
        return findFirstByTour_TourIdOrderByIdDesc(tourId);
    }
}
