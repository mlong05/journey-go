package com.journeygo.modules.community.entity;

import com.journeygo.modules.community.entity.enums.ReportReason;
import com.journeygo.modules.community.entity.enums.ReportStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Báo cáo vi phạm một bình luận. Bình luận hiện ngay khi đăng; cộng đồng báo cáo và kiểm duyệt viên xử lý sau.
 * Bảng do Hibernate quản lý (ddl-auto: update), giống {@link PostReport}.
 */
@Entity
@Table(name = "comment_reports",
        uniqueConstraints = @UniqueConstraint(name = "uk_comment_reports_comment_reporter",
                columnNames = {"comment_id", "reporter_id"}),
        indexes = {
                @Index(name = "idx_comment_reports_comment_id", columnList = "comment_id"),
                @Index(name = "idx_comment_reports_status", columnList = "status")
        })
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommentReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "comment_id", nullable = false)
    private Long commentId;

    @Column(name = "reporter_id", nullable = false)
    private Long reporterId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reason", nullable = false, length = 50)
    private ReportReason reason;

    @Column(name = "description", length = 500)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private ReportStatus status = ReportStatus.PENDING;

    @Column(name = "resolved_by")
    private Long resolvedBy;

    @Column(name = "resolution_note", length = 500)
    private String resolutionNote;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "resolved_at")
    private Instant resolvedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}
