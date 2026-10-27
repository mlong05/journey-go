package com.journeygo.modules.moderation.repository;

import com.journeygo.modules.moderation.entity.DestinationReview;
import com.journeygo.modules.moderation.entity.enums.DestinationReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface DestinationReviewRepository extends JpaRepository<DestinationReview, Long> {
    Page<DestinationReview> findByStatusAndDestination_DeletedFalse(DestinationReviewStatus status, Pageable pageable);
    Optional<DestinationReview> findByDestination_Id(Long destinationId);
}
