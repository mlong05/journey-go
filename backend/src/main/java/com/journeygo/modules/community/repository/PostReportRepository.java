package com.journeygo.modules.community.repository;

import java.util.Collection;
import org.springframework.data.repository.query.Param;
import org.springframework.data.jpa.repository.Query;
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

    long countByPostIdAndStatus(Long postId, ReportStatus status);

    List<PostReport> findByPostIdAndStatus(Long postId, ReportStatus status);

    /** Đếm báo cáo theo trạng thái cho nhiều bài một lần, mỗi dòng là [postId, số báo cáo]. */
    @Query("select r.postId, count(r) from PostReport r where r.postId in :postIds and r.status = :status group by r.postId")
    List<Object[]> countByPostIdsAndStatus(@Param("postIds") Collection<Long> postIds, @Param("status") ReportStatus status);

    void deleteByPostId(Long postId);
}
