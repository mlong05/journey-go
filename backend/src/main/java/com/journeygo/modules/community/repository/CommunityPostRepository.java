package com.journeygo.modules.community.repository;

import com.journeygo.modules.community.entity.CommunityPost;
import com.journeygo.modules.community.entity.enums.PostStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CommunityPostRepository extends JpaRepository<CommunityPost, Long> {

    @Query("SELECT p FROM CommunityPost p WHERE p.status = :status AND p.hidden = false " +
           "AND (:destinationId IS NULL OR p.destinationId = :destinationId) " +
           "AND (:tourId IS NULL OR p.tourId = :tourId) " +
           "ORDER BY p.createdAt DESC")
    Page<CommunityPost> findFeedPosts(
            @Param("status") PostStatus status,
            @Param("destinationId") Long destinationId,
            @Param("tourId") Long tourId,
            Pageable pageable
    );

    Page<CommunityPost> findByAuthorIdOrderByCreatedAtDesc(Long authorId, Pageable pageable);

    Page<CommunityPost> findByStatusOrderByCreatedAtAsc(PostStatus status, Pageable pageable);

    @Query("SELECT p FROM CommunityPost p LEFT JOIN FETCH p.mediaList WHERE p.id = :id")
    Optional<CommunityPost> findByIdWithMedia(@Param("id") Long id);
}
