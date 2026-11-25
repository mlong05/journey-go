package com.journeygo.modules.tourrequest.entity;

import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tourrequest.entity.enums.TourRequestStatus;
import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "tour_requests", indexes = {
        @Index(name = "idx_tour_requests_status", columnList = "status"),
        @Index(name = "idx_tour_requests_requester", columnList = "requester_id"),
        @Index(name = "idx_tour_requests_accepted_by", columnList = "accepted_by")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "requester_id", nullable = false)
    private User requester;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String description;

    @Column(name = "preferred_destination", length = 500)
    private String preferredDestination;

    @Column(name = "preferred_date_from")
    private LocalDate preferredDateFrom;

    @Column(name = "preferred_date_to")
    private LocalDate preferredDateTo;

    @Column(name = "guest_count")
    private Integer guestCount;

    @Column(name = "budget_min", precision = 15, scale = 2)
    private BigDecimal budgetMin;

    @Column(name = "budget_max", precision = 15, scale = 2)
    private BigDecimal budgetMax;

    @Column(name = "special_requirements", columnDefinition = "TEXT")
    private String specialRequirements;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private TourRequestStatus status = TourRequestStatus.OPEN;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "accepted_by")
    private User acceptedBy;

    @Column(name = "accepted_at")
    private Instant acceptedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "fulfilled_tour_id")
    private Tour fulfilledTour;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        if (this.status == null) {
            this.status = TourRequestStatus.OPEN;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
