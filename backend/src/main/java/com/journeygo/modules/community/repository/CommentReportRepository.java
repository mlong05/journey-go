package com.journeygo.modules.community.repository;

import com.journeygo.modules.community.entity.CommentReport;
import com.journeygo.modules.community.entity.enums.ReportStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface CommentReportRepository extends JpaRepository<CommentReport, Long> {

    Page<CommentReport> findByStatusOrderByCreatedAtDesc(ReportStatus status, Pageable pageable);

    boolean existsByCommentIdAndReporterId(Long commentId, Long reporterId);

    long countByCommentIdAndStatus(Long commentId, ReportStatus status);

    boolean existsByCommentIdAndStatus(Long commentId, ReportStatus status);

    List<CommentReport> findByCommentIdAndStatus(Long commentId, ReportStatus status);

    /** Đếm báo cáo chờ cho nhiều bình luận một lần, mỗi dòng là [commentId, số báo cáo]. */
    @Query("select r.commentId, count(r) from CommentReport r where r.commentId in :ids and r.status = :status group by r.commentId")
    List<Object[]> countByCommentIdsAndStatus(@Param("ids") Collection<Long> ids, @Param("status") ReportStatus status);

    void deleteByCommentId(Long commentId);

    /** Xoá báo cáo của mọi bình luận thuộc một bài (khi tác giả xoá bài, bình luận bị xoá theo). */
    @org.springframework.data.jpa.repository.Modifying
    @Query("delete from CommentReport r where r.commentId in (select c.id from PostComment c where c.postId = :postId)")
    void deleteByPostId(@Param("postId") Long postId);
}
