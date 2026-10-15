package com.journeygo.modules.experience.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Đáp án cho một Question.
 *
 * BR-TASK-6:
 *   - MULTIPLE_CHOICE: nhiều answer, đúng 1 is_correct=true.
 *   - TEXT: 0 hoặc nhiều answer, TẤT CẢ is_correct=true (mỗi answer là 1 cách viết được chấp nhận).
 *
 * BR-TASK-5: KHÔNG BAO GIỜ gửi isCorrect / explanation xuống Tourist — dùng AnswerResponse.forTourist().
 */
@Entity
@Table(name = "answer")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Answer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id", nullable = false)
    private Question question;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "is_correct", nullable = false)
    @Builder.Default
    private boolean isCorrect = false;

    @Column(name = "sequence_order", nullable = false)
    @Builder.Default
    private Integer sequenceOrder = 0;

    /** Lý do giải thích — KHÔNG BAO GIỜ trả xuống Tourist. */
    @Column(columnDefinition = "TEXT")
    private String explanation;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}