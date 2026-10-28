package com.journeygo.modules.experience.repository;

import com.journeygo.modules.experience.entity.Experience;
import com.journeygo.modules.experience.entity.enums.ExperienceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ExperienceRepository extends JpaRepository<Experience, Long> {

    // ── By destination (one-to-many) ──────────────────────────────────────────

    List<Experience> findByDestination_Id(Long destinationId);

    List<Experience> findByDestination_IdInOrderById(List<Long> destinationIds);

    Page<Experience> findByDestination_Id(Long destinationId, Pageable pageable);

    long countByDestination_Id(Long destinationId);

    // ── Global status filters ─────────────────────────────────────────────────

    Page<Experience> findByStatus(ExperienceStatus status, Pageable pageable);

    Page<Experience> findByStatusIn(List<ExperienceStatus> statuses, Pageable pageable);

    Page<Experience> findByStatusNot(ExperienceStatus status, Pageable pageable);

    List<Experience> findByStatusAndCreatedBy_Id(ExperienceStatus status, Long createdById);

    // ── With owner eager-loaded (avoid N+1) ───────────────────────────────────

    @Query("SELECT e FROM Experience e JOIN FETCH e.createdBy WHERE e.id = :id")
    Optional<Experience> findByIdWithOwner(@Param("id") Long id);

    @Query("SELECT e FROM Experience e JOIN FETCH e.createdBy WHERE e.destination.id = :destinationId")
    List<Experience> findByDestinationIdWithOwner(@Param("destinationId") Long destinationId);

    @EntityGraph(attributePaths = {"createdBy"})
    @Query(value = "SELECT e FROM Experience e",
           countQuery = "SELECT count(e) FROM Experience e")
    Page<Experience> findAllWithCreatedBy(Pageable pageable);

    @EntityGraph(attributePaths = {"createdBy"})
    @Query(value = "SELECT e FROM Experience e WHERE e.status = :status",
           countQuery = "SELECT count(e) FROM Experience e WHERE e.status = :status")
    Page<Experience> findByStatusWithCreatedBy(ExperienceStatus status, Pageable pageable);

    @EntityGraph(attributePaths = {"createdBy"})
    @Query(value = "SELECT e FROM Experience e WHERE e.status <> :status",
           countQuery = "SELECT count(e) FROM Experience e WHERE e.status <> :status")
    Page<Experience> findByStatusNotWithCreatedBy(ExperienceStatus status, Pageable pageable);

    // ── Filter by destination ─────────────────────────────────────────────────

    @EntityGraph(attributePaths = {"createdBy"})
    @Query(value = "SELECT e FROM Experience e WHERE e.destination.id = :destinationId",
           countQuery = "SELECT count(e) FROM Experience e WHERE e.destination.id = :destinationId")
    Page<Experience> findByDestinationIdWithCreatedBy(
            @Param("destinationId") Long destinationId, Pageable pageable);

    @EntityGraph(attributePaths = {"createdBy"})
    @Query(value = "SELECT e FROM Experience e WHERE e.destination.id = :destinationId AND e.status = :status",
           countQuery = "SELECT count(e) FROM Experience e WHERE e.destination.id = :destinationId AND e.status = :status")
    Page<Experience> findByDestinationIdAndStatusWithCreatedBy(
            @Param("destinationId") Long destinationId,
            @Param("status") ExperienceStatus status,
            Pageable pageable);

    @EntityGraph(attributePaths = {"createdBy"})
    @Query(value = "SELECT e FROM Experience e WHERE e.destination.id = :destinationId AND e.status <> :excludedStatus",
           countQuery = "SELECT count(e) FROM Experience e WHERE e.destination.id = :destinationId AND e.status <> :excludedStatus")
    Page<Experience> findByDestinationIdAndStatusNotWithCreatedBy(
            @Param("destinationId") Long destinationId,
            @Param("excludedStatus") ExperienceStatus excludedStatus,
            Pageable pageable);

    // ── Filter by destination + owner (for /experiences/mine) ─────────────────

    @EntityGraph(attributePaths = {"createdBy"})
    @Query(value = "SELECT e FROM Experience e WHERE e.createdBy.id = :createdById",
           countQuery = "SELECT count(e) FROM Experience e WHERE e.createdBy.id = :createdById")
    Page<Experience> findByCreatedById(@Param("createdById") Long createdById, Pageable pageable);

    @EntityGraph(attributePaths = {"createdBy"})
    @Query(value = "SELECT e FROM Experience e WHERE e.createdBy.id = :createdById AND e.status <> :excludedStatus",
           countQuery = "SELECT count(e) FROM Experience e WHERE e.createdBy.id = :createdById AND e.status <> :excludedStatus")
    Page<Experience> findByCreatedByIdAndStatusNot(
            @Param("createdById") Long createdById,
            @Param("excludedStatus") ExperienceStatus excludedStatus,
            Pageable pageable);

    @EntityGraph(attributePaths = {"createdBy"})
    @Query(value = "SELECT e FROM Experience e WHERE e.createdBy.id = :createdById AND e.destination.id = :destinationId",
           countQuery = "SELECT count(e) FROM Experience e WHERE e.createdBy.id = :createdById AND e.destination.id = :destinationId")
    Page<Experience> findByCreatedByIdAndDestinationId(
            @Param("createdById") Long createdById,
            @Param("destinationId") Long destinationId,
            Pageable pageable);

    @EntityGraph(attributePaths = {"createdBy"})
    @Query(value = "SELECT e FROM Experience e WHERE e.createdBy.id = :createdById AND e.destination.id = :destinationId AND e.status = :status",
           countQuery = "SELECT count(e) FROM Experience e WHERE e.createdBy.id = :createdById AND e.destination.id = :destinationId AND e.status = :status")
    Page<Experience> findByCreatedByIdAndDestinationIdAndStatus(
            @Param("createdById") Long createdById,
            @Param("destinationId") Long destinationId,
            @Param("status") ExperienceStatus status,
            Pageable pageable);

    @EntityGraph(attributePaths = {"createdBy"})
    @Query(value = "SELECT e FROM Experience e WHERE e.createdBy.id = :createdById AND e.destination.id = :destinationId AND e.status <> :excludedStatus",
           countQuery = "SELECT count(e) FROM Experience e WHERE e.createdBy.id = :createdById AND e.destination.id = :destinationId AND e.status <> :excludedStatus")
    Page<Experience> findByCreatedByIdAndDestinationIdAndStatusNot(
            @Param("createdById") Long createdById,
            @Param("destinationId") Long destinationId,
            @Param("excludedStatus") ExperienceStatus excludedStatus,
            Pageable pageable);
}
