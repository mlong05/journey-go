package com.journeygo.modules.moderation.repository;

import com.journeygo.modules.moderation.entity.DestinationRequestHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DestinationRequestHistoryRepository extends JpaRepository<DestinationRequestHistory, Long> {

    List<DestinationRequestHistory> findByRequest_IdOrderByCreatedAtAsc(Long requestId);
}
