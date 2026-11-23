package com.journeygo.modules.tourrequest.repository;

import com.journeygo.modules.tourrequest.entity.TourRequest;
import com.journeygo.modules.tourrequest.entity.enums.TourRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface TourRequestRepository extends JpaRepository<TourRequest, Long> {

    Page<TourRequest> findByRequester_Id(Long requesterId, Pageable pageable);

    Page<TourRequest> findByStatus(TourRequestStatus status, Pageable pageable);

    Page<TourRequest> findByAcceptedBy_Id(Long acceptedById, Pageable pageable);

    long countByRequester_IdAndStatus(Long requesterId, TourRequestStatus status);
}
