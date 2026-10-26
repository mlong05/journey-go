package com.journeygo.modules.moderation.repository;

import com.journeygo.modules.moderation.entity.ContentReviewHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface ContentReviewHistoryRepository extends JpaRepository<ContentReviewHistory, Long> {
    List<ContentReviewHistory> findByReview_IdOrderByCreatedAtAsc(Long reviewId);
}
