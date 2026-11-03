package com.journeygo.modules.journey.entity;

import com.journeygo.modules.journey.entity.enums.JourneyStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "journeys", indexes = {
        @Index(name = "idx_journeys_user_id", columnList = "user_id"),
        @Index(name = "idx_journeys_booking_id", columnList = "booking_id"),
        @Index(name = "idx_journeys_tour_id", columnList = "tour_id"),
        @Index(name = "idx_journeys_status", columnList = "status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Journey {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "booking_id")
    private Long bookingId;

    @Column(name = "tour_id", nullable = false)
    private Long tourId;

    @Column(name = "tour_name", length = 255)
    private String tourName;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private JourneyStatus status = JourneyStatus.NOT_STARTED;

    @Column(name = "current_destination_order", nullable = false)
    @Builder.Default
    private Integer currentDestinationOrder = 1;

    @Column(name = "total_destinations", nullable = false)
    @Builder.Default
    private Integer totalDestinations = 0;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @OneToMany(mappedBy = "journey", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    private List<JourneyDestinationProgress> destinations = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public void addDestination(JourneyDestinationProgress dest) {
        destinations.add(dest);
        dest.setJourney(this);
        // Nhiệm vụ thường được thêm vào điểm đến TRƯỚC khi điểm đến gắn vào hành trình,
        // lúc đó addTask chưa biết journey: gắn lại ở đây để journey_id không bị null.
        dest.getTasks().forEach(task -> task.setJourney(this));
    }
}
