package com.journeygo.modules.experience.entity;

import com.journeygo.modules.experience.entity.enums.UnlockConditionType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Điều kiện mở khóa (unlock condition) cho một Task.
 *
 * Schema theo ĐÚ-02 §3.8:
 *   - task_id UNIQUE — 1 task có đúng 1 unlock_condition.
 *   - prerequisite_task_id optional — cho kiểu SEQUENTIAL.
 *   - condition_type: SEQUENTIAL / SCORE_BASED / TIME_BASED / LOCATION_VERIFICATION / NONE.
 *   - check_in_point_id optional — cho kiểu LOCATION_VERIFICATION (Tourist phải ở trong bán kính CIP).
 *
 * Logic kiểm tra runtime thuộc module Tourist Execution (chưa build) — module này chỉ cấu hình.
 */
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

    /** Task phải hoàn thành trước — chỉ dùng khi condition_type = SEQUENTIAL. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "prerequisite_task_id")
    private Task prerequisiteTask;

    @Enumerated(EnumType.STRING)
    @Column(name = "condition_type", nullable = false, length = 30)
    @Builder.Default
    private UnlockConditionType conditionType = UnlockConditionType.NONE;

    /** Chỉ dùng khi condition_type = SCORE_BASED (0-100). */
    @Column(name = "minimum_score_percent")
    private Integer minimumScorePercent;

    /** Chỉ dùng khi condition_type = TIME_BASED. */
    @Column(name = "time_window_minutes")
    private Integer timeWindowMinutes;

    /** Chỉ dùng khi condition_type = LOCATION_VERIFICATION — Tourist phải ở trong bán kính CIP. */
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
