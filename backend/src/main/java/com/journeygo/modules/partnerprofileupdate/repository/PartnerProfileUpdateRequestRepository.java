package com.journeygo.modules.partnerprofileupdate.repository;

import com.journeygo.modules.partnerprofileupdate.entity.PartnerProfileUpdateRequest;
import com.journeygo.modules.partnerprofileupdate.entity.enums.PartnerProfileUpdateStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PartnerProfileUpdateRequestRepository extends JpaRepository<PartnerProfileUpdateRequest, Long> {

    /** Yêu cầu đang chờ duyệt của đối tác (nếu có) — dùng để khóa tạo yêu cầu mới. */
    Optional<PartnerProfileUpdateRequest> findFirstByPartner_IdAndStatusOrderByCreatedAtDesc(
            Long partnerUserId, PartnerProfileUpdateStatus status);

    /** Tất cả yêu cầu của một đối tác (mới nhất trước). */
    List<PartnerProfileUpdateRequest> findByPartner_IdOrderByCreatedAtDesc(Long partnerUserId);

    Page<PartnerProfileUpdateRequest> findByStatus(PartnerProfileUpdateStatus status, Pageable pageable);

    Page<PartnerProfileUpdateRequest> findAllByOrderByCreatedAtDesc(Pageable pageable);

    long countByStatus(PartnerProfileUpdateStatus status);
}
