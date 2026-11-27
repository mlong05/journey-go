package com.journeygo.modules.tourfeedback.repository;

import com.journeygo.modules.tourfeedback.entity.TourCustomerReviewReport;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface TourCustomerReviewReportRepository extends JpaRepository<TourCustomerReviewReport, Long> {

    boolean existsByReview_IdAndReporter_Id(Long reviewId, Long reporterId);

    List<TourCustomerReviewReport> findByReview_IdOrderByCreatedAtDesc(Long reviewId);

    Optional<TourCustomerReviewReport> findByReview_IdAndReporter_Id(Long reviewId, Long reporterId);

    Page<TourCustomerReviewReport> findByStatusOrderByCreatedAtDesc(
            TourCustomerReviewReport.Status status, Pageable pageable);
}
