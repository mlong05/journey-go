package com.journeygo.modules.community.dto;

import com.journeygo.modules.community.entity.CommentReport;
import com.journeygo.modules.community.entity.CommunityPost;
import com.journeygo.modules.community.entity.PostComment;
import com.journeygo.modules.community.entity.enums.ReportReason;
import com.journeygo.modules.community.entity.enums.ReportStatus;
import io.swagger.v3.oas.annotations.media.Schema;

import java.time.Instant;

/** Báo cáo bình luận kèm nội dung bình luận và bài chứa nó, để kiểm duyệt viên xử lý tại chỗ. */
@Schema(description = "Báo cáo vi phạm một bình luận")
public record CommentReportResponse(
        Long id,
        Long commentId,
        String commentContent,
        Long commentAuthorId,
        String commentAuthorName,
        String commentAuthorAvatarUrl,
        boolean commentHidden,
        Instant commentCreatedAt,
        Long postId,
        String postTitle,
        ReportReason reason,
        String description,
        ReportStatus status,
        String resolutionNote,
        @Schema(description = "Số báo cáo chờ xử lý của cùng bình luận") int pendingReportCount,
        Instant createdAt,
        Instant resolvedAt
) {
    public static CommentReportResponse of(CommentReport r, PostComment comment, CommunityPost post, int pendingCount) {
        return new CommentReportResponse(
                r.getId(),
                r.getCommentId(),
                comment == null ? null : comment.getContent(),
                comment == null ? null : comment.getAuthorId(),
                comment == null ? null : comment.getAuthorName(),
                comment == null ? null : comment.getAuthorAvatarUrl(),
                comment != null && comment.isHidden(),
                comment == null ? null : comment.getCreatedAt(),
                comment == null ? null : comment.getPostId(),
                post == null ? null : post.getTitle(),
                r.getReason(),
                r.getDescription(),
                r.getStatus(),
                r.getResolutionNote(),
                pendingCount,
                r.getCreatedAt(),
                r.getResolvedAt());
    }
}
