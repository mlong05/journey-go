package com.journeygo.modules.moderation.entity;

import com.journeygo.modules.content.entity.CulturalContent;
import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;
import java.time.Instant;

@Entity
@Table(name = "content_reviews", indexes = @Index(name = "idx_content_reviews_status_submitted", columnList = "status, submitted_at"))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class ContentReview {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "content_id", nullable = false, unique = true)
    private CulturalContent content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ContentReviewStatus status = ContentReviewStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id")
    private User reviewer;

    @Column(name = "decision_note", length = 1000)
    private String decisionNote;

    /** Comma-separated ContentRejectionReason codes selected by the reviewer. */
    @Column(name = "reason", length = 500)
    private String reason;

    @Column(name = "other_reason", length = 500)
    private String otherReason;

    @Column(name = "submitted_at", nullable = false)
    private Instant submittedAt;

    @Column(name = "reviewed_at")
    private Instant reviewedAt;

    @PrePersist
    void onCreate() { if (submittedAt == null) submittedAt = Instant.now(); }
}
