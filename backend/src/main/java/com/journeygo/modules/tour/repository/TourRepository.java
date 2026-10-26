package com.journeygo.modules.tour.repository;

import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface TourRepository extends JpaRepository<Tour, Long> {

    // ── Standard queries — @SQLRestriction("deleted = false") auto-applied ────

    Page<Tour> findAll(Pageable pageable);

    Optional<Tour> findByTourId(Long tourId);

    Page<Tour> findByStatus(TourStatus status, Pageable pageable);

    List<Tour> findByStatus(TourStatus status);

    Page<Tour> findByApprovedTrue(Pageable pageable);

    List<Tour> findByApprovedTrue();

    Page<Tour> findByCreatedBy_Id(Long creatorId, Pageable pageable);

    boolean existsByTitle(String title);

    boolean existsByTitleAndTourIdNot(String title, Long tourId);

    // ── Giá tour (tính động từ Experience của các điểm đến) ─────────────────

    /**
     * Tính tổng giá của một tour = tổng giá các Experience thuộc các điểm đến
     * nằm trong hành trình tour.
     *
     * Experience đã xoá mềm (INACTIVE) không được tính vào giá.
     *
     * @param tourId ID tour
     * @return Tổng giá (null nếu tour không có Experience nào)
     */
    @Query("""
            SELECT SUM(e.price)
            FROM Experience e
            WHERE e.status <> com.journeygo.modules.experience.entity.enums.ExperienceStatus.INACTIVE
              AND e.destination.id IN (
                  SELECT td.destination.id
                  FROM TourDestination td
                  WHERE td.tour.tourId = :tourId
              )
            """)
    BigDecimal calculateTotalPriceByTourId(@Param("tourId") Long tourId);

    /**
     * Tính tổng giá cho nhiều tour cùng lúc (tránh N+1 khi hiển thị danh sách).
     *
     * @param tourIds Danh sách ID tour
     * @return Danh sách tourId + tổng giá tương ứng
     */
    @Query("""
            SELECT new com.journeygo.modules.tour.repository.TourPriceProjection(
                td.tour.tourId,
                SUM(e.price)
            )
            FROM TourDestination td, Experience e
            WHERE e.destination.id = td.destination.id
              AND td.tour.tourId IN :tourIds
              AND e.status <> com.journeygo.modules.experience.entity.enums.ExperienceStatus.INACTIVE
            GROUP BY td.tour.tourId
            """)
    List<TourPriceProjection> calculateTotalPricesByTourIds(@Param("tourIds") List<Long> tourIds);

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
