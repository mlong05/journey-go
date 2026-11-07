package com.journeygo.modules.partnerapplication.repository;

import com.journeygo.modules.partnerapplication.entity.PartnerApplicationHistory;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface PartnerApplicationHistoryRepository extends JpaRepository<PartnerApplicationHistory, Long> {

    List<PartnerApplicationHistory> findByApplication_IdOrderByCreatedAtDesc(Long applicationId);

    List<PartnerApplicationHistory> findByApplication_IdAndActor_IdOrderByCreatedAtDesc(Long applicationId, Long actorId);
}
