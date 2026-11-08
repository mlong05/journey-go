package com.journeygo.modules.tour.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Câu hỏi trong nhiệm vụ của điểm đến.
 * QUIZ thuộc nhiệm vụ ({@code task}); POST_EXPERIENCE thuộc trải nghiệm thực tế ({@code experience}).
 * Cả hai đều là trắc nghiệm (4 đáp án, 1 đúng) hoặc tự luận ({@link QuestionType}).
 */
@Entity
@Table(name = "tour_stop_questions")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourStopQuestion {

    public static final int ANSWER_COUNT = 4;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** Dữ liệu cũ: quiz trước đây gắn thẳng vào điểm đến. Câu hỏi mới để trống. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stop_id")
    private TourStop stop;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private TourStopTask task;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "experience_id")
    private TourStopExperience experience;

    @Enumerated(EnumType.STRING)
    @Column(name = "kind", nullable = false, length = 20)
    private StopQuestionKind kind;

    @Column(name = "sequence_order", nullable = false)
    private int sequenceOrder;

    @Enumerated(EnumType.STRING)
    @Column(name = "question_type", nullable = false, length = 20)
    @Builder.Default
    private QuestionType questionType = QuestionType.MULTIPLE_CHOICE;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    /** Câu tự luận: đáp án gợi ý (không bắt buộc). Trắc nghiệm: để trống. */
    @Column(name = "reference_answer", columnDefinition = "TEXT")
    private String referenceAnswer;

    public boolean isTextQuestion() {
        return questionType == QuestionType.TEXT;
    }

    /** Không còn dùng: điểm thưởng tính theo nhiệm vụ (loại nhiệm vụ). Giữ cột cho dữ liệu cũ. */
    @Column(name = "points_reward")
    private Integer pointsReward;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceOrder ASC")
    @Builder.Default
    private List<TourStopAnswer> answers = new ArrayList<>();
}
