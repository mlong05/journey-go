package com.journeygo.modules.experience.entity;

import com.journeygo.modules.experience.entity.enums.UnlockConditionType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "unlock_condition")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UnlockCondition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false, unique = true)
    private Task task;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prerequisite_task_id")
    private Task prerequisiteTask;

    @Enumerated(EnumType.STRING)
    @Column(name = "condition_type", nullable = false, length = 30)
    @Builder.Default
    private UnlockConditionType conditionType = UnlockConditionType.NONE;


    @Column(name = "minimum_score_percent")
    private Integer minimumScorePercent;


    @Column(name = "time_window_minutes")
    private Integer timeWindowMinutes;


    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "check_in_point_id")
    private CheckInPoint checkInPoint;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}
