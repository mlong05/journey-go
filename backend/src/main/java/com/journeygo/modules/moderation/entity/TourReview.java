package com.journeygo.modules.moderation.entity;

import com.journeygo.modules.moderation.entity.enums.TourReviewStatus;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Một lần gửi duyệt tour. Tour có nhiều lần gửi (1-nhiều); lần mới nhất là lần hiện hành.
 */
@Entity
@Table(name = "tour_reviews", indexes = {
        @Index(name = "idx_tour_reviews_status_submitted", columnList = "status, submitted_at"),
        @Index(name = "idx_tour_reviews_tour", columnList = "tour_id")
})
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class TourReview {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tour_id", nullable = false)
    private Tour tour;

    /** Phiên bản tour được gửi duyệt lần này. */
    @Column(name = "tour_version")
    private Integer tourVersion;

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

    // ── 5 tiêu chí Moderator tick (dù duyệt hay từ chối) ─────────────────────

    @Column(name = "crit_interactive")
    private Boolean critInteractive;

    @Column(name = "crit_local_expertise")
    private Boolean critLocalExpertise;

    @Column(name = "crit_storytelling")
    private Boolean critStorytelling;

    @Column(name = "crit_cultural_ratio")
    private Boolean critCulturalRatio;

    @Column(name = "crit_authentic_media")
    private Boolean critAuthenticMedia;

    /** Ghi chú gắn cờ theo bước / điểm đến (khi yêu cầu chỉnh sửa hoặc từ chối). */
    @OneToMany(mappedBy = "review", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("id ASC")
    @Builder.Default
    private List<TourReviewNote> notes = new ArrayList<>();

    @PrePersist
    void onCreate() { if (submittedAt == null) submittedAt = Instant.now(); }

    public int criteriaPassedCount() {
        int count = 0;
        for (Boolean value : new Boolean[]{critInteractive, critLocalExpertise, critStorytelling,
                critCulturalRatio, critAuthenticMedia}) {
            if (Boolean.TRUE.equals(value)) count++;
        }
        return count;
    }
}
