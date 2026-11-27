package com.journeygo.modules.tourfeedback.entity;

import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

/**
 * Đánh giá xác thực từ du khách sau khi hoàn thành chuyến đi.
 * Mỗi cặp (booking_id, reviewer_id) chỉ được phép đánh giá tối đa một lần.
 */
@Entity
@Table(name = "tour_customer_reviews", uniqueConstraints = {
        @UniqueConstraint(name = "uk_tour_customer_reviews_booking_reviewer", columnNames = {"booking_id", "reviewer_id"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourCustomerReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tour_id", nullable = false)
    private Tour tour;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "reviewer_id", nullable = false)
    private User reviewer;

    @Column(name = "overall_rating", nullable = false)
    private Integer overallRating;

    @Column(name = "guide_rating")
    private Integer guideRating;

    @Column(name = "culture_rating")
    private Integer cultureRating;

    @Column(name = "schedule_rating")
    private Integer scheduleRating;

    @Column(name = "value_rating")
    private Integer valueRating;

    @Column(name = "title", length = 150)
    private String title;

    @Column(name = "comment", nullable = false, columnDefinition = "TEXT")
    private String comment;

    @ElementCollection(fetch = FetchType.LAZY)
    @CollectionTable(name = "tour_customer_review_images", joinColumns = @JoinColumn(name = "review_id"))
    @OrderColumn(name = "order_index")
    @Column(name = "image_url", nullable = false, length = 1000)
    @Builder.Default
    private List<String> imageUrls = new ArrayList<>();

    @Column(name = "verified_purchase", nullable = false)
    @Builder.Default
    private boolean verifiedPurchase = true;

    @Column(name = "experience_date", nullable = false)
    private LocalDate experienceDate;

    @Column(name = "provider_reply", columnDefinition = "TEXT")
    private String providerReply;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "provider_replied_by")
    private User providerRepliedBy;

    @Column(name = "provider_replied_at")
    private Instant providerRepliedAt;

    @Column(name = "is_hidden", nullable = false)
    @Builder.Default
    private boolean hidden = false;

    @Column(name = "hidden_reason", length = 500)
    private String hiddenReason;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "hidden_by")
    private User hiddenBy;

    @Column(name = "hidden_at")
    private Instant hiddenAt;

    @Column(name = "edited_at")
    private Instant editedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
