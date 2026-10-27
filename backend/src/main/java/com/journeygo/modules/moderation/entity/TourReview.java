package com.journeygo.modules.moderation.entity;

import com.journeygo.modules.moderation.entity.enums.TourReviewStatus;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "tour_reviews", indexes = @Index(name = "idx_tour_reviews_status_submitted", columnList = "status, submitted_at"))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class TourReview {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tour_id", nullable = false, unique = true)
    private Tour tour;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TourReviewStatus status = TourReviewStatus.PENDING;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewer_id")
    private User reviewer;

    @Column(name = "decision_note", length = 1000)
    private String decisionNote;

    @Column(length = 500)
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
