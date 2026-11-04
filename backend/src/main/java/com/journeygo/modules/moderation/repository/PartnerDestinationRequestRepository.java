package com.journeygo.modules.moderation.repository;

import com.journeygo.modules.moderation.entity.PartnerDestinationRequest;
import com.journeygo.modules.moderation.entity.enums.DestinationRequestStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.Optional;

@Repository
public interface PartnerDestinationRequestRepository extends JpaRepository<PartnerDestinationRequest, Long>, JpaSpecificationExecutor<PartnerDestinationRequest> {

    Page<PartnerDestinationRequest> findByPartner_Id(Long partnerId, Pageable pageable);

    Page<PartnerDestinationRequest> findByAssignedCp_Id(Long assignedCpId, Pageable pageable);

    Page<PartnerDestinationRequest> findByStatus(DestinationRequestStatus status, Pageable pageable);

    Page<PartnerDestinationRequest> findByStatusIn(Collection<DestinationRequestStatus> statuses, Pageable pageable);

    Optional<PartnerDestinationRequest> findByDestination_Id(Long destinationId);

    default Page<PartnerDestinationRequest> searchRequests(
            DestinationRequestStatus status,
            String search,
            Pageable pageable
    ) {
        return findAll(DestinationRequestSpecifications.filter(null, null, status, search), pageable);
    }

    default Page<PartnerDestinationRequest> searchMyRequests(
            Long partnerId,
            DestinationRequestStatus status,
            String search,
            Pageable pageable
    ) {
        return findAll(DestinationRequestSpecifications.filter(partnerId, null, status, search), pageable);
    }

    default Page<PartnerDestinationRequest> searchAssignedToCp(
            Long cpId,
            DestinationRequestStatus status,
            String search,
            Pageable pageable
    ) {
        return findAll(DestinationRequestSpecifications.filter(null, cpId, status, search), pageable);
    }
}
