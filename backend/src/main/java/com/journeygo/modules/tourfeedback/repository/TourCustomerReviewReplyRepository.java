package com.journeygo.modules.tourfeedback.repository;

import com.journeygo.modules.tourfeedback.entity.TourCustomerReviewReply;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TourCustomerReviewReplyRepository extends JpaRepository<TourCustomerReviewReply, Long> {

    List<TourCustomerReviewReply> findByReview_IdOrderByCreatedAtDesc(Long reviewId);

    /** Phản hồi đã được duyệt (mới hiển thị công khai) của một đánh giá. */
    List<TourCustomerReviewReply> findByReview_IdAndStatusOrderByCreatedAtDesc(
            Long reviewId, TourCustomerReviewReply.Status status);

    Optional<TourCustomerReviewReply> findFirstByReview_IdAndAuthor_IdOrderByCreatedAtDesc(
            Long reviewId, Long authorId);

    Page<TourCustomerReviewReply> findByStatusOrderByCreatedAtDesc(
            TourCustomerReviewReply.Status status, Pageable pageable);
}
