package com.journeygo.modules.experience.entity;

import com.journeygo.modules.experience.entity.enums.QuestionType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Câu hỏi trong Task (chỉ có ở task loại QUIZ / FIELD_CLUE).
 *
 * Schema theo ĐÚ-02 §3.5:
 *   - expected_text: đáp án cho câu TEXT (so sánh không phân biệt hoa/thường) — chỉ trả cho CP/CM.
 *   - question_type: MULTIPLE_CHOICE / TEXT.
 *
 * BR-TASK-6: MULTIPLE_CHOICE đúng 1 is_correct=true; TEXT tất cả is_correct=true.
 */
@Entity
@Table(name = "question")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Question {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "task_id", nullable = false)
    private Task task;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    /** Đáp án cho câu TEXT. KHÔNG BAO GIỜ trả xuống Tourist (BR-TASK-5). */
    @Column(name = "expected_text", length = 500)
    private String expectedText;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false, length = 20)
    @Builder.Default
    private QuestionType questionType = QuestionType.MULTIPLE_CHOICE;

    @Column(name = "sequence_order", nullable = false)
    @Builder.Default
    private Integer sequenceOrder = 0;

    @Column(nullable = false)
    @Builder.Default
    private Integer points = 0;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    // ── 1-N ─────────────────────────────────────────────────────────────────────

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("sequenceOrder ASC")
    @Builder.Default
    private List<Answer> answers = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}