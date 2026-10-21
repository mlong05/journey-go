package com.journeygo.modules.community.repository;

import com.journeygo.modules.community.entity.PostMedia;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostMediaRepository extends JpaRepository<PostMedia, Long> {

    List<PostMedia> findByPostIdOrderByOrderIndexAsc(Long postId);

    void deleteByPostId(Long postId);
}
