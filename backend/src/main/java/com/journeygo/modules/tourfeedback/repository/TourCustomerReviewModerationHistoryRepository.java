package com.journeygo.modules.tourfeedback.repository;

import com.journeygo.modules.tourfeedback.entity.TourCustomerReviewModerationHistory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TourCustomerReviewModerationHistoryRepository
        extends JpaRepository<TourCustomerReviewModerationHistory, Long> {

    List<TourCustomerReviewModerationHistory> findByReview_IdOrderByCreatedAtDesc(Long reviewId);

    /** Lịch sử kiểm duyệt toàn hệ thống (dùng cho trang /moderator/history). */
    @Query(value = """
            SELECT h FROM TourCustomerReviewModerationHistory h
            JOIN FETCH h.review r
            JOIN FETCH r.tour t
            LEFT JOIN FETCH h.actor a
            WHERE (:keyword = ''
               OR LOWER(t.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(COALESCE(h.actorName, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(COALESCE(h.reason, '')) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """,
            countQuery = """
            SELECT COUNT(h) FROM TourCustomerReviewModerationHistory h
            JOIN h.review r
            JOIN r.tour t
            WHERE (:keyword = ''
               OR LOWER(t.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(COALESCE(h.actorName, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(COALESCE(h.reason, '')) LIKE LOWER(CONCAT('%', :keyword, '%')))
            """)
    Page<TourCustomerReviewModerationHistory> findAllForHistory(
            @Param("keyword") String keyword,
            Pageable pageable);
}
