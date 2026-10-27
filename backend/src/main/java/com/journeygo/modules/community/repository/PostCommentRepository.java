package com.journeygo.modules.community.repository;

import com.journeygo.modules.community.entity.PostComment;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface PostCommentRepository extends JpaRepository<PostComment, Long> {

    Page<PostComment> findByPostIdAndHiddenFalseOrderByCreatedAtAsc(Long postId, Pageable pageable);

    int countByPostIdAndHiddenFalse(Long postId);

    void deleteByPostId(Long postId);
}
