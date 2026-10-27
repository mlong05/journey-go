package com.journeygo.modules.moderation.repository;

import com.journeygo.modules.moderation.entity.DestinationReviewHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface DestinationReviewHistoryRepository extends JpaRepository<DestinationReviewHistory, Long> {
    List<DestinationReviewHistory> findByReview_IdOrderByCreatedAtAsc(Long reviewId);
}
