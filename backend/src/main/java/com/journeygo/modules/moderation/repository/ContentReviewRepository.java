package com.journeygo.modules.moderation.repository;

import com.journeygo.modules.moderation.entity.ContentReview;
import com.journeygo.modules.moderation.entity.enums.ContentReviewStatus;
import com.journeygo.modules.content.entity.CulturalContent;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;
import java.util.Optional;

public interface ContentReviewRepository extends JpaRepository<ContentReview, Long> {
    Page<ContentReview> findByStatusAndContent_DeletedFalseAndContent_Destination_DeletedFalse(ContentReviewStatus status, Pageable pageable);
    Optional<ContentReview> findByContent_Id(Long contentId);
    @Query("select c from CulturalContent c where c.destination.id = :destinationId and c.deleted = false and c.destination.deleted = false and (not exists (select r.id from ContentReview r where r.content = c) or exists (select r.id from ContentReview r where r.content = c and r.status = :status)) order by c.sequenceOrder asc")
    List<CulturalContent> findPublicContentByDestination(@Param("destinationId") Long destinationId, @Param("status") ContentReviewStatus status);
    @Query("select c from CulturalContent c where c.deleted = false and c.destination.deleted = false and (not exists (select r.id from ContentReview r where r.content = c) or exists (select r.id from ContentReview r where r.content = c and r.status = :status)) order by c.destination.id asc, c.sequenceOrder asc")
    List<CulturalContent> findAllPublicContent(@Param("status") ContentReviewStatus status);
}
