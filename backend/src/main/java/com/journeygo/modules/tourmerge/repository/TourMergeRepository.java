package com.journeygo.modules.tourmerge.repository;

import com.journeygo.modules.tour.entity.TourSlot;
import com.journeygo.modules.tourmerge.entity.TourMerge;
import com.journeygo.modules.tourmerge.entity.enums.TourMergeStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface TourMergeRepository extends JpaRepository<TourMerge, Long> {

    @Query("""
            SELECT COUNT(m) > 0 FROM TourMerge m
            WHERE (m.hostSlot.id = :slotId OR m.guestSlot.id = :slotId)
              AND m.status IN :activeStatuses
            """)
    boolean existsActiveMergeForSlot(@Param("slotId") Long slotId,
                                     @Param("activeStatuses") List<TourMergeStatus> activeStatuses);

    @Query("""
            SELECT COUNT(m) > 0 FROM TourMerge m
            WHERE (m.hostSlot.id = :slotId OR m.guestSlot.id = :slotId)
              AND m.id <> :excludeId
              AND m.status IN :activeStatuses
            """)
    boolean existsActiveMergeForSlotExcluding(@Param("slotId") Long slotId,
                                              @Param("excludeId") Long excludeId,
                                              @Param("activeStatuses") List<TourMergeStatus> activeStatuses);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT m FROM TourMerge m WHERE m.id = :id")
    Optional<TourMerge> findByIdForUpdate(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT m FROM TourMerge m
            WHERE (m.hostSlot.id = :slotId OR m.guestSlot.id = :slotId)
              AND m.status = com.journeygo.modules.tourmerge.entity.enums.TourMergeStatus.APPROVED
            """)
    Optional<TourMerge> findApprovedBySlotIdForUpdate(@Param("slotId") Long slotId);

    @Query("""
            SELECT m FROM TourMerge m
            JOIN FETCH m.hostSlot hs
            JOIN FETCH m.guestSlot gs
            WHERE m.status = com.journeygo.modules.tourmerge.entity.enums.TourMergeStatus.APPROVED
              AND (hs.id IN :slotIds OR gs.id IN :slotIds)
            """)
    List<TourMerge> findApprovedBySlotIds(@Param("slotIds") Collection<Long> slotIds);

    @Query(value = """
            SELECT m FROM TourMerge m
            WHERE m.initiatorProvider.id = :providerId OR m.targetProvider.id = :providerId
            ORDER BY m.createdAt DESC
            """,
            countQuery = """
            SELECT COUNT(m) FROM TourMerge m
            WHERE m.initiatorProvider.id = :providerId OR m.targetProvider.id = :providerId
            """)
    Page<TourMerge> findByProviderId(@Param("providerId") Long providerId, Pageable pageable);

    @Query(value = """
            SELECT m FROM TourMerge m
            WHERE (m.initiatorProvider.id = :providerId OR m.targetProvider.id = :providerId)
              AND m.status = :status
            ORDER BY m.createdAt DESC
            """,
            countQuery = """
            SELECT COUNT(m) FROM TourMerge m
            WHERE (m.initiatorProvider.id = :providerId OR m.targetProvider.id = :providerId)
              AND m.status = :status
            """)
    Page<TourMerge> findByProviderIdAndStatus(@Param("providerId") Long providerId,
                                              @Param("status") TourMergeStatus status,
                                              Pageable pageable);

    Page<TourMerge> findByStatusOrderByCreatedAtDesc(TourMergeStatus status, Pageable pageable);

    Page<TourMerge> findAllByOrderByCreatedAtDesc(Pageable pageable);

    @Query("""
            SELECT s FROM TourSlot s
            JOIN FETCH s.tour t
            WHERE t.createdBy.id = :providerId
              AND t.deleted = false
              AND t.status = com.journeygo.modules.tour.entity.enums.TourStatus.PUBLISHED
              AND s.status = com.journeygo.modules.tour.entity.TourSlotStatus.OPEN
              AND s.slotDate >= :today
              AND NOT EXISTS (
                  SELECT m.id FROM TourMerge m
                  WHERE (m.hostSlot.id = s.id OR m.guestSlot.id = s.id)
                    AND m.status IN :activeStatuses
              )
            ORDER BY s.slotDate ASC, t.title ASC
            """)
    List<TourSlot> findEligibleOwnSlots(@Param("providerId") Long providerId,
                                        @Param("today") LocalDate today,
                                        @Param("activeStatuses") List<TourMergeStatus> activeStatuses);

    @Query("""
            SELECT s FROM TourSlot s
            JOIN FETCH s.tour t
            JOIN FETCH t.createdBy u
            WHERE s.slotDate = :slotDate
              AND s.id <> :mySlotId
              AND t.tourId <> :myTourId
              AND t.deleted = false
              AND t.status = com.journeygo.modules.tour.entity.enums.TourStatus.PUBLISHED
              AND s.status = com.journeygo.modules.tour.entity.TourSlotStatus.OPEN
              AND NOT EXISTS (
                  SELECT m.id FROM TourMerge m
                  WHERE (m.hostSlot.id = s.id OR m.guestSlot.id = s.id)
                    AND m.status IN :activeStatuses
              )
            ORDER BY t.title ASC
            """)
    List<TourSlot> findOpenUnmergedCandidateSlots(@Param("slotDate") LocalDate slotDate,
                                                  @Param("mySlotId") Long mySlotId,
                                                  @Param("myTourId") Long myTourId,
                                                  @Param("activeStatuses") List<TourMergeStatus> activeStatuses);
}
