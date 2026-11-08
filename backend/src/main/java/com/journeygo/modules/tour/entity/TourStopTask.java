package com.journeygo.modules.tour.entity;

import jakarta.persistence.*;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

/**
 * Nhiệm vụ của một điểm đến. Mỗi nhiệm vụ gồm quiz (1–4 câu) và trải nghiệm thực tế (1–5, mỗi trải nghiệm
 * có checkpoint, đếm ngược và 1 câu hỏi sau trải nghiệm). Điểm thưởng mỗi nhiệm vụ do Admin cấu hình
 * (RewardSettingCode.TOUR_TASK).
 */
@Entity
@Table(name = "tour_stop_tasks")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourStopTask {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "stop_id")
    private TourStop stop;

    @Column(name = "sequence_order", nullable = false)
    private int sequenceOrder;

    @Column(name = "title", length = 200)
    private String title;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    /** Điểm thưởng — chốt từ cấu hình Admin (Điểm mỗi nhiệm vụ) lúc tour được duyệt; đối tác không sửa. */
    @Column(name = "points_reward")
    private Integer pointsReward;

    /** Quiz của nhiệm vụ (kind = QUIZ). */
    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceOrder ASC")
    @Builder.Default
    private List<TourStopQuestion> quizQuestions = new ArrayList<>();

    /** Trải nghiệm thực tế của nhiệm vụ — làm sau quiz. */
    @OneToMany(mappedBy = "task", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceOrder ASC")
    @Builder.Default
    private List<TourStopExperience> experiences = new ArrayList<>();
}
