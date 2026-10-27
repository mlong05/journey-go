package com.journeygo.modules.community.dto;

import com.journeygo.modules.community.entity.enums.PostStatus;
import com.journeygo.modules.community.entity.CommunityPost;
import com.journeygo.modules.community.entity.PostReport;
import com.journeygo.modules.community.entity.enums.ReportReason;
import com.journeygo.modules.community.entity.enums.ReportStatus;
import lombok.Builder;

import java.time.Instant;

@Builder(toBuilder = true)
public record ReportResponse(
        Long id,
        Long postId,
        Long reporterId,
        ReportReason reason,
        String description,
        ReportStatus status,
        Long resolvedBy,
        String resolutionNote,
        Instant createdAt,
        Instant resolvedAt,
        String postTitle,
        String postContentPreview,
        PostStatus postStatus,
        Boolean postHidden,
        String postAuthorName,
        Integer pendingReportCount
) {
    /** Kèm thông tin bài bị báo cáo để moderator xem được ngay cả khi bài đã bị ẩn. */
    public static ReportResponse fromEntity(PostReport report, CommunityPost post, int pendingReportCount) {
        ReportResponseBuilder builder = fromEntity(report).toBuilder();
        if (post != null) {
            String content = post.getContent() == null ? "" : post.getContent();
            builder.postTitle(post.getTitle())
                    .postContentPreview(content.length() > 300 ? content.substring(0, 300) + "…" : content)
                    .postStatus(post.getStatus())
                    .postHidden(post.isHidden())
                    .postAuthorName(post.getAuthorName());
        }
        return builder.pendingReportCount(pendingReportCount).build();
    }

    public static ReportResponse fromEntity(PostReport report) {
        return ReportResponse.builder()
                .id(report.getId())
                .postId(report.getPostId())
                .reporterId(report.getReporterId())
                .reason(report.getReason())
                .description(report.getDescription())
                .status(report.getStatus())
                .resolvedBy(report.getResolvedBy())
                .resolutionNote(report.getResolutionNote())
                .createdAt(report.getCreatedAt())
                .resolvedAt(report.getResolvedAt())
                .build();
    }
}
