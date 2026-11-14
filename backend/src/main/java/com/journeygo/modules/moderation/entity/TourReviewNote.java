package com.journeygo.modules.moderation.entity;

import com.journeygo.modules.moderation.entity.enums.TourReviewStep;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Ghi chú Moderator gắn cờ vào một vị trí của tour.
 * Ví dụ: step = STOPS, stopId = 12, field = "quiz[2]", note = "Câu quiz số 2 có hai đáp án đúng".
 */
@Entity
@Table(name = "tour_review_notes", indexes = @Index(name = "idx_tour_review_notes_review", columnList = "review_id"))
@Getter @Setter @Builder @NoArgsConstructor @AllArgsConstructor
public class TourReviewNote {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "review_id", nullable = false)
    private TourReview review;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TourReviewStep step;

    /** Điểm đến bị gắn cờ (id của tour_stops), không bắt buộc. */
    @Column(name = "stop_id")
    private Long stopId;

    @Column(length = 100)
    private String field;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String note;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    void onCreate() { if (createdAt == null) createdAt = Instant.now(); }
}
