package com.journeygo.modules.journey.repository;

import com.journeygo.modules.journey.entity.JourneyTaskProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JourneyTaskProgressRepository extends JpaRepository<JourneyTaskProgress, Long> {

    List<JourneyTaskProgress> findByDestinationProgressIdOrderByOrderIndexAsc(Long destinationProgressId);

    List<JourneyTaskProgress> findByJourneyId(Long journeyId);

    Optional<JourneyTaskProgress> findByDestinationProgressIdAndTaskId(Long destinationProgressId, Long taskId);
}
