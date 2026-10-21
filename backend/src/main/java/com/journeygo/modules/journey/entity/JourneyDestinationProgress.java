package com.journeygo.modules.journey.entity;

import com.journeygo.modules.journey.entity.enums.DestinationProgressStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "journey_destination_progress", indexes = {
        @Index(name = "idx_jdp_journey_id", columnList = "journey_id"),
        @Index(name = "idx_jdp_destination_id", columnList = "destination_id"),
        @Index(name = "idx_jdp_status", columnList = "status")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_journey_destination", columnNames = {"journey_id", "destination_id"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JourneyDestinationProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "journey_id", nullable = false)
    private Journey journey;

    @Column(name = "destination_id", nullable = false)
    private Long destinationId;

    @Column(name = "destination_name", length = 255)
    private String destinationName;

    @Column(name = "order_index", nullable = false)
    private Integer orderIndex;

    @Column(name = "experience_id")
    private Long experienceId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private DestinationProgressStatus status = DestinationProgressStatus.NOT_STARTED;

    @Column(name = "checked_in", nullable = false)
    @Builder.Default
    private boolean checkedIn = false;

    @Column(name = "checked_in_at")
    private Instant checkedInAt;

    @Column(name = "check_in_record_id")
    private Long checkInRecordId;

    @Column(name = "badge_awarded", nullable = false)
    @Builder.Default
    private boolean badgeAwarded = false;

    @Column(name = "badge_id")
    private Long badgeId;

    @Column(name = "tasks_completed", nullable = false)
    @Builder.Default
    private Integer tasksCompleted = 0;

    @Column(name = "total_tasks", nullable = false)
    @Builder.Default
    private Integer totalTasks = 0;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;

    @OneToMany(mappedBy = "destinationProgress", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    private List<JourneyTaskProgress> tasks = new ArrayList<>();

    public void addTask(JourneyTaskProgress task) {
        tasks.add(task);
        task.setDestinationProgress(this);
        task.setJourney(this.journey);
    }
}
