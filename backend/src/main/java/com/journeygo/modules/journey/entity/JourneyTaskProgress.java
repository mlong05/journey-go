package com.journeygo.modules.journey.entity;

import com.journeygo.modules.journey.entity.enums.TaskProgressStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "journey_task_progress", indexes = {
        @Index(name = "idx_jtp_journey_id", columnList = "journey_id"),
        @Index(name = "idx_jtp_destination_progress_id", columnList = "destination_progress_id"),
        @Index(name = "idx_jtp_task_id", columnList = "task_id"),
        @Index(name = "idx_jtp_status", columnList = "status")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_journey_destination_task", columnNames = {"destination_progress_id", "task_id"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JourneyTaskProgress {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "journey_id", nullable = false)
    private Journey journey;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "destination_progress_id", nullable = false)
    private JourneyDestinationProgress destinationProgress;

    @Column(name = "task_id", nullable = false)
    private Long taskId;

    @Column(name = "task_name", length = 255)
    private String taskName;

    @Column(name = "task_type", nullable = false, length = 50)
    private String taskType;

    @Column(name = "order_index", nullable = false)
    @Builder.Default
    private Integer orderIndex = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private TaskProgressStatus status = TaskProgressStatus.NOT_STARTED;

    @Column(name = "points_earned", nullable = false)
    @Builder.Default
    private Integer pointsEarned = 0;

    @Column(name = "attempts", nullable = false)
    @Builder.Default
    private Integer attempts = 0;

    /** Vị trí câu hỏi hiện tại (từ 0) khi nhiệm vụ đi theo từng địa điểm; về 0 khi làm lại. */
    @Column(name = "current_question_index", nullable = false, columnDefinition = "integer default 0")
    @Builder.Default
    private Integer currentQuestionIndex = 0;

    /** Thứ tự tự do: id các câu hỏi đã trả lời đúng, ngăn cách bằng dấu phẩy. Giữ nguyên khi trả lời sai. */
    @Column(name = "answered_question_ids", length = 2000)
    private String answeredQuestionIds;

    /** Tập id câu đã đúng (thứ tự tự do). */
    public java.util.Set<Long> answeredIdSet() {
        java.util.Set<Long> set = new java.util.LinkedHashSet<>();
        if (answeredQuestionIds == null || answeredQuestionIds.isBlank()) return set;
        for (String part : answeredQuestionIds.split(",")) {
            try {
                set.add(Long.parseLong(part.trim()));
            } catch (NumberFormatException ignored) {
                // bỏ qua phần hỏng
            }
        }
        return set;
    }

    public void markAnswered(Long questionId) {
        java.util.Set<Long> set = answeredIdSet();
        set.add(questionId);
        answeredQuestionIds = set.stream().map(String::valueOf).collect(java.util.stream.Collectors.joining(","));
    }

    @Column(name = "user_answer", columnDefinition = "TEXT")
    private String userAnswer;

    @Column(name = "is_correct")
    private Boolean isCorrect;

    @Column(name = "started_at")
    private Instant startedAt;

    @Column(name = "completed_at")
    private Instant completedAt;
}
