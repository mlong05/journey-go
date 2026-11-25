package com.journeygo.modules.tourrequest.repository;

import com.journeygo.modules.tourrequest.entity.TourRequest;
import com.journeygo.modules.tourrequest.entity.enums.TourRequestStatus;
import com.journeygo.modules.user.entity.User;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;

@Repository
public interface TourRequestRepository extends JpaRepository<TourRequest, Long> {

    Page<TourRequest> findByRequester_Id(Long requesterId, Pageable pageable);

    Page<TourRequest> findByStatus(TourRequestStatus status, Pageable pageable);

    Page<TourRequest> findByAcceptedBy_Id(Long acceptedById, Pageable pageable);

    long countByRequester_IdAndStatus(Long requesterId, TourRequestStatus status);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE TourRequest tr SET tr.status = :acceptedStatus, tr.acceptedBy = :provider, tr.acceptedAt = :now, tr.updatedAt = :now " +
           "WHERE tr.id = :id AND tr.status = :openStatus")
    int acceptIfOpen(@Param("id") Long id,
                     @Param("provider") User provider,
                     @Param("now") Instant now,
                     @Param("openStatus") TourRequestStatus openStatus,
                     @Param("acceptedStatus") TourRequestStatus acceptedStatus);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("UPDATE TourRequest tr SET tr.status = :expiredStatus, tr.updatedAt = :now " +
           "WHERE tr.status = :openStatus AND (" +
           "  (tr.preferredDateFrom IS NOT NULL AND tr.preferredDateFrom < :today) OR " +
           "  (tr.preferredDateFrom IS NULL AND tr.createdAt < :cutoff)" +
           ")")
    int expirePastOpenRequests(@Param("openStatus") TourRequestStatus openStatus,
                               @Param("expiredStatus") TourRequestStatus expiredStatus,
                               @Param("today") LocalDate today,
                               @Param("cutoff") Instant cutoff,
                               @Param("now") Instant now);
}
