package com.journeygo.modules.tour.repository;

import com.journeygo.modules.tour.entity.Tour;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TourRepository extends JpaRepository<Tour, Long> {

    // ── Standard queries — @SQLRestriction("deleted = false") auto-applied ────

    Page<Tour> findAll(Pageable pageable);

    Optional<Tour> findByTourId(Long tourId);

    Page<Tour> findByApprovedTrue(Pageable pageable);

    List<Tour> findByApprovedTrue();

    Page<Tour> findByCreatedBy_Id(Long creatorId, Pageable pageable);

    /** Tour của đối tác tạo theo luồng 5 bước. */
    Page<Tour> findByCreatedBy_IdAndTourFormatIsNotNull(Long creatorId, Pageable pageable);

    Page<Tour> findByCreatedBy_IdAndTourFormatIsNotNullAndStatus(Long creatorId,
            com.journeygo.modules.tour.entity.enums.TourStatus status, Pageable pageable);

    @Query("""
            SELECT new com.journeygo.modules.tour.repository.TourPriceProjection(td.tour.tourId, SUM(e.price))
            FROM TourDestination td, Experience e
            WHERE e.destination = td.destination
              AND e.status = com.journeygo.modules.experience.entity.enums.ExperienceStatus.PUBLISHED
              AND td.tour.tourId IN :tourIds
            GROUP BY td.tour.tourId
            """)
    List<TourPriceProjection> sumExperiencePricesByTourIds(@Param("tourIds") List<Long> tourIds);

    @Query("""
            SELECT new com.journeygo.modules.tour.repository.TourRewardProjection(
                td.tour.tourId, COUNT(t), COALESCE(SUM(t.pointsReward), 0))
            FROM TourDestination td, Task t
            WHERE t.experience.destination = td.destination
              AND t.experience.status = com.journeygo.modules.experience.entity.enums.ExperienceStatus.PUBLISHED
              AND t.status = com.journeygo.modules.experience.entity.enums.TaskStatus.PUBLISHED
              AND td.tour.tourId IN :tourIds
            GROUP BY td.tour.tourId
            """)
    List<TourRewardProjection> sumTaskRewardsByTourIds(@Param("tourIds") List<Long> tourIds);

    /** Số điểm đến trong tour có huy hiệu check-in đã bị quản trị viên tắt: [tourId, count]. */
    @Query("""
            SELECT td.tour.tourId, COUNT(b)
            FROM TourDestination td, com.journeygo.modules.gamification.entity.Badge b
            WHERE b.destinationId = td.destination.id AND b.active = false
              AND td.tour.tourId IN :tourIds
            GROUP BY td.tour.tourId
            """)
    List<Object[]> countDisabledBadgesByTourIds(@Param("tourIds") List<Long> tourIds);

    boolean existsByTitle(String title);

    boolean existsByTitleAndTourIdNot(String title, Long tourId);

    // ── Admin-only: bypass @SQLRestriction to read deleted rows ──────────────

    @Query(value = "SELECT * FROM tours WHERE deleted = true ORDER BY created_at DESC",
            countQuery = "SELECT COUNT(*) FROM tours WHERE deleted = true",
            nativeQuery = true)
    Page<Tour> findDeleted(Pageable pageable);

    @Query(value = "SELECT * FROM tours WHERE deleted = true ORDER BY created_at DESC",
            nativeQuery = true)
    List<Tour> findDeleted();

    @Query(value = "SELECT * FROM tours WHERE tour_id = :tourId AND deleted = true",
            nativeQuery = true)
    Optional<Tour> findDeletedByTourId(@Param("tourId") Long tourId);
}
