package com.journeygo.modules.tour.entity;

import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLRestriction;

import java.time.Instant;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "tours")
@SQLRestriction("deleted = false")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Tour {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long tourId;

    @Column(nullable = false)
    private String title;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private TourType tourType = TourType.OTHER;

    @Column(nullable = false)
    private int durationDays;

    /** Price per participant, captured directly on the tour. */
    @Column(precision = 12, scale = 2)
    private BigDecimal price;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    /** Administrative approval flag (mirrors status for legacy compatibility). */
    @Column(nullable = false)
    @Builder.Default
    private boolean approved = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30, columnDefinition = "varchar(30) default 'DRAFT'")
    @Builder.Default
    private TourStatus status = TourStatus.DRAFT;

    /** Populated by admin/moderator when rejecting the tour. */
    @Column(name = "rejection_reason", columnDefinition = "TEXT")
    private String rejectionReason;

    @Column(nullable = false)
    @Builder.Default
    private boolean deleted = false;

    /** Timestamp set when the tour is soft-deleted. Null while active. */
    @Column(name = "deleted_at")
    private Instant deletedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    /** Ordered list of destinations that make up this tour. */
    @OneToMany(mappedBy = "tour", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceOrder ASC")
    @Builder.Default
    private List<TourDestination> tourDestinations = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        if (this.status == null) {
            this.status = TourStatus.DRAFT;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    // ── Soft-delete helpers ───────────────────────────────────────────────────

    /** Soft-delete: flag as deleted and stamp the deletion time. */
    public void softDelete() {
        this.deleted = true;
        this.deletedAt = Instant.now();
    }

    /** Restore: clear the deleted flag and the deletion timestamp. */
    public void softRestore() {
        this.deleted = false;
        this.deletedAt = null;
    }

    /** Calculate the total number of destinations in this tour. */
    public int getDestinationCount() {
        return tourDestinations == null ? 0 : tourDestinations.size();
    }
}
