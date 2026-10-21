package com.journeygo.modules.community.repository;

import com.journeygo.modules.community.entity.PostReport;
import com.journeygo.modules.community.entity.enums.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface PostReportRepository extends JpaRepository<PostReport, Long> {

    Page<PostReport> findByStatusOrderByCreatedAtDesc(ReportStatus status, Pageable pageable);

    List<PostReport> findByPostId(Long postId);

    boolean existsByPostIdAndReporterId(Long postId, Long reporterId);
}
