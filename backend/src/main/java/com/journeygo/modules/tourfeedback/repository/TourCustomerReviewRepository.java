package com.journeygo.modules.tourfeedback.repository;

import com.journeygo.modules.tourfeedback.entity.TourCustomerReview;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface TourCustomerReviewRepository extends JpaRepository<TourCustomerReview, Long> {

    boolean existsByBooking_IdAndReviewer_Id(Long bookingId, Long reviewerId);

    @EntityGraph(attributePaths = {"booking", "tour", "tour.createdBy", "reviewer", "providerRepliedBy", "hiddenBy", "imageUrls"})
    Optional<TourCustomerReview> findByBooking_IdAndReviewer_Id(Long bookingId, Long reviewerId);

    @EntityGraph(attributePaths = {"booking", "tour", "tour.createdBy", "reviewer", "providerRepliedBy", "hiddenBy", "imageUrls"})
    @Query("SELECT r FROM TourCustomerReview r WHERE r.id = :id")
    Optional<TourCustomerReview> findByIdWithRelations(@Param("id") Long id);

    @EntityGraph(attributePaths = {"booking", "tour", "reviewer", "providerRepliedBy"})
    @Query(value = """
            SELECT r FROM TourCustomerReview r
            WHERE r.tour.tourId = :tourId
              AND r.hidden = false
              AND (:rating IS NULL OR r.overallRating = :rating)
              AND (:onlyWithPhotos = false OR SIZE(r.imageUrls) > 0)
            """,
            countQuery = """
            SELECT COUNT(r) FROM TourCustomerReview r
            WHERE r.tour.tourId = :tourId
              AND r.hidden = false
              AND (:rating IS NULL OR r.overallRating = :rating)
              AND (:onlyWithPhotos = false OR SIZE(r.imageUrls) > 0)
            """)
    Page<TourCustomerReview> findPublicByTourId(@Param("tourId") Long tourId,
                                                @Param("rating") Integer rating,
                                                @Param("onlyWithPhotos") boolean onlyWithPhotos,
                                                Pageable pageable);

    @EntityGraph(attributePaths = {"booking", "tour", "reviewer", "providerRepliedBy"})
    Page<TourCustomerReview> findByReviewer_IdOrderByCreatedAtDesc(Long reviewerId, Pageable pageable);

    @EntityGraph(attributePaths = {"booking", "tour", "reviewer", "providerRepliedBy"})
    @Query(value = """
            SELECT r FROM TourCustomerReview r
            WHERE r.tour.createdBy.id = :providerId
              AND r.hidden = false
              AND (:tourId IS NULL OR r.tour.tourId = :tourId)
              AND (:rating IS NULL OR r.overallRating = :rating)
              AND (
                    :repliedFilter = 'ALL'
                 OR (:repliedFilter = 'REPLIED' AND r.providerReply IS NOT NULL)
                 OR (:repliedFilter = 'UNREPLIED' AND r.providerReply IS NULL)
              )
            """,
            countQuery = """
            SELECT COUNT(r) FROM TourCustomerReview r
            WHERE r.tour.createdBy.id = :providerId
              AND r.hidden = false
              AND (:tourId IS NULL OR r.tour.tourId = :tourId)
              AND (:rating IS NULL OR r.overallRating = :rating)
              AND (
                    :repliedFilter = 'ALL'
                 OR (:repliedFilter = 'REPLIED' AND r.providerReply IS NOT NULL)
                 OR (:repliedFilter = 'UNREPLIED' AND r.providerReply IS NULL)
              )
            """)
    Page<TourCustomerReview> findForProvider(@Param("providerId") Long providerId,
                                             @Param("tourId") Long tourId,
                                             @Param("rating") Integer rating,
                                             @Param("repliedFilter") String repliedFilter,
                                             Pageable pageable);

    @EntityGraph(attributePaths = {"booking", "tour", "tour.createdBy", "reviewer", "providerRepliedBy", "hiddenBy"})
    @Query(value = """
            SELECT r FROM TourCustomerReview r
            WHERE (
                    :visibilityFilter = 'ALL'
                 OR (:visibilityFilter = 'VISIBLE' AND r.hidden = false)
                 OR (:visibilityFilter = 'HIDDEN' AND r.hidden = true)
            )
              AND (:rating IS NULL OR r.overallRating = :rating)
              AND (
                    :keyword = ''
                 OR LOWER(r.tour.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(r.reviewer.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(r.comment) LIKE LOWER(CONCAT('%', :keyword, '%'))
              )
            """,
            countQuery = """
            SELECT COUNT(r) FROM TourCustomerReview r
            WHERE (
                    :visibilityFilter = 'ALL'
                 OR (:visibilityFilter = 'VISIBLE' AND r.hidden = false)
                 OR (:visibilityFilter = 'HIDDEN' AND r.hidden = true)
            )
              AND (:rating IS NULL OR r.overallRating = :rating)
              AND (
                    :keyword = ''
                 OR LOWER(r.tour.title) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(r.reviewer.fullName) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(r.comment) LIKE LOWER(CONCAT('%', :keyword, '%'))
              )
            """)
    Page<TourCustomerReview> findForModeration(@Param("visibilityFilter") String visibilityFilter,
                                               @Param("rating") Integer rating,
                                               @Param("keyword") String keyword,
                                               Pageable pageable);

    @Query("""
            SELECT COUNT(r),
                   AVG(r.overallRating),
                   AVG(r.guideRating),
                   AVG(r.cultureRating),
                   AVG(r.scheduleRating),
                   AVG(r.valueRating),
                   SUM(CASE WHEN SIZE(r.imageUrls) > 0 THEN 1 ELSE 0 END),
                   SUM(CASE WHEN r.providerReply IS NOT NULL THEN 1 ELSE 0 END)
            FROM TourCustomerReview r
            WHERE r.tour.tourId = :tourId AND r.hidden = false
            """)
    List<Object[]> aggregateTourSummary(@Param("tourId") Long tourId);

    @Query("""
            SELECT r.overallRating, COUNT(r)
            FROM TourCustomerReview r
            WHERE r.tour.tourId = :tourId AND r.hidden = false
            GROUP BY r.overallRating
            """)
    List<Object[]> countStarsByTourId(@Param("tourId") Long tourId);

    @Query("""
            SELECT COUNT(r),
                   AVG(r.overallRating),
                   SUM(CASE WHEN r.providerReply IS NULL THEN 1 ELSE 0 END),
                   AVG(r.guideRating),
                   AVG(r.cultureRating),
                   AVG(r.scheduleRating),
                   AVG(r.valueRating)
            FROM TourCustomerReview r
            WHERE r.tour.createdBy.id = :providerId AND r.hidden = false
            """)
    List<Object[]> aggregateProviderSummary(@Param("providerId") Long providerId);

    @Query("""
            SELECT r.overallRating, COUNT(r)
            FROM TourCustomerReview r
            WHERE r.tour.createdBy.id = :providerId AND r.hidden = false
            GROUP BY r.overallRating
            """)
    List<Object[]> countStarsByProviderId(@Param("providerId") Long providerId);

    @Query("""
            SELECT r.tour.tourId, AVG(r.overallRating), COUNT(r)
            FROM TourCustomerReview r
            WHERE r.tour.tourId IN :tourIds AND r.hidden = false
            GROUP BY r.tour.tourId
            """)
    List<Object[]> aggregateBatchByTourIds(@Param("tourIds") Collection<Long> tourIds);
}
