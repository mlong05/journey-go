package com.journeygo.modules.tour.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Câu hỏi của điểm đến.
 * QUIZ thuộc điểm đến ({@code stop}); POST_EXPERIENCE thuộc trải nghiệm ({@code experience}).
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

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stop_id")
    private TourStop stop;

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

    /** Quiz: điểm mỗi câu, chốt từ cấu hình Admin lúc duyệt. POST_EXPERIENCE: để trống (điểm nằm ở trải nghiệm). */
    @Column(name = "points_reward")
    private Integer pointsReward;

    @OneToMany(mappedBy = "question", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceOrder ASC")
    @Builder.Default
    private List<TourStopAnswer> answers = new ArrayList<>();
}
