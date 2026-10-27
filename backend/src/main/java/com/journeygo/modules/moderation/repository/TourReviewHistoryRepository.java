package com.journeygo.modules.moderation.repository;

import com.journeygo.modules.moderation.entity.TourReviewHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TourReviewHistoryRepository extends JpaRepository<TourReviewHistory, Long> {
    List<TourReviewHistory> findByReview_IdOrderByCreatedAtAsc(Long reviewId);
}
