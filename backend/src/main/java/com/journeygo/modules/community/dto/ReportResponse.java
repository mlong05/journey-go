package com.journeygo.modules.community.dto;

import com.journeygo.modules.community.entity.PostReport;
import com.journeygo.modules.community.entity.enums.ReportReason;
import com.journeygo.modules.community.entity.enums.ReportStatus;
import lombok.Builder;

import java.time.Instant;

@Builder
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
        Instant resolvedAt
) {
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
