package com.journeygo.modules.experience.entity;

import com.journeygo.modules.experience.entity.enums.TaskStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Một task con trong Experience (câu đố / nhiệm vụ thực địa / check-in / ảnh thử thách).
 *
 * Schema theo ĐÚ-02 §3.3:
 *   - (experience_id, sequence_order) UNIQUE — BR-TASK-2.
 *   - check_in_point_id optional (chỉ task GPS/QR/Field cần).
 */
@Entity
@Table(name = "task", uniqueConstraints = {
        @UniqueConstraint(name = "uk_task_experience_sequence", columnNames = {"experience_id", "sequence_order"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Task {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "experience_id", nullable = false)
    private Experience experience;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_type_id", nullable = false)
    private TaskType taskType;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "sequence_order", nullable = false)
    @Builder.Default
    private Integer sequenceOrder = 0;

    @Column(name = "points_reward", nullable = false)
    @Builder.Default
    private Integer pointsReward = 0;

    @Column(name = "max_attempts")
    @Builder.Default
    private Integer maxAttempts = 3;

    /** Chỉ áp dụng cho task GPS / QR / FIELD_CLUE — BR-TASK-4. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "check_in_point_id")
    private CheckInPoint checkInPoint;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private TaskStatus status = TaskStatus.DRAFT;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}