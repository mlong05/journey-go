package com.journeygo.modules.content.repository;

import com.journeygo.modules.content.entity.CulturalContent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface CulturalContentRepository extends JpaRepository<CulturalContent, Long> {

    List<CulturalContent> findByDestinationIdAndDeletedFalseAndDestinationDeletedFalseOrderBySequenceOrderAsc(Long destinationId);

    List<CulturalContent> findByDestinationIdAndDeletedTrueOrderBySequenceOrderAsc(Long destinationId);

    Optional<CulturalContent> findByIdAndDeletedFalseAndDestinationDeletedFalse(Long id);

    Optional<CulturalContent> findByIdAndDeletedTrue(Long id);
}
