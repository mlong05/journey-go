package com.journeygo.modules.tour.repository;

import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourStatus;
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

    Page<Tour> findByStatus(TourStatus status, Pageable pageable);

    List<Tour> findByStatus(TourStatus status);

    Page<Tour> findByApprovedTrue(Pageable pageable);

    List<Tour> findByApprovedTrue();

    Page<Tour> findByCreatedBy_Id(Long creatorId, Pageable pageable);

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
