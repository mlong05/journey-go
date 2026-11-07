package com.journeygo.modules.moderation.entity;

import com.journeygo.modules.moderation.entity.enums.TourReviewAction;
import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "tour_review_history", indexes = @Index(name = "idx_tour_review_history_review_created", columnList = "review_id, created_at"))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class TourReviewHistory {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "review_id", nullable = false)
    private TourReview review;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TourReviewAction action;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "actor_id")
    private User actor;

    @Column(length = 1000)
    private String note;

    @Column(length = 500)
    private String reason;

    @Column(name = "other_reason", length = 500)
    private String otherReason;

    /** Trạng thái tour trước / sau thao tác (mục 9.5). */
    @Column(name = "from_status", length = 30)
    private String fromStatus;

    @Column(name = "to_status", length = 30)
    private String toStatus;

    /** Phiên bản tour tại thời điểm thao tác. */
    @Column(name = "tour_version")
    private Integer tourVersion;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { if (createdAt == null) createdAt = Instant.now(); }
}
