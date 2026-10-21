package com.journeygo.modules.journey.repository;

import com.journeygo.modules.journey.entity.JourneyDestinationProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface JourneyDestinationProgressRepository extends JpaRepository<JourneyDestinationProgress, Long> {

    List<JourneyDestinationProgress> findByJourneyIdOrderByOrderIndexAsc(Long journeyId);

    Optional<JourneyDestinationProgress> findByJourneyIdAndDestinationId(Long journeyId, Long destinationId);

    Optional<JourneyDestinationProgress> findByJourneyIdAndOrderIndex(Long journeyId, Integer orderIndex);

    @Query("SELECT jdp FROM JourneyDestinationProgress jdp LEFT JOIN FETCH jdp.tasks WHERE jdp.id = :id")
    Optional<JourneyDestinationProgress> findByIdWithTasks(@Param("id") Long id);
}
