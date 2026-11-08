package com.journeygo.modules.tour.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Trải nghiệm thực tế: khách đến checkpoint (trong bán kính) → bấm Bắt đầu → đếm ngược
 * {@code durationSeconds} → hiện câu hỏi sau trải nghiệm. Thuộc một nhiệm vụ ({@link TourStopTask}).
 */
@Entity
@Table(name = "tour_stop_experiences")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourStopExperience {

    public static final int DEFAULT_RADIUS_METERS = 50;

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stop_id", nullable = false)
    private TourStop stop;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "task_id")
    private TourStopTask task;

    @Column(name = "sequence_order", nullable = false)
    private int sequenceOrder;

    @Column(name = "activity_name", length = 200)
    private String activityName;

    @Column(name = "checkpoint_latitude", precision = 10, scale = 7)
    private BigDecimal checkpointLatitude;

    @Column(name = "checkpoint_longitude", precision = 10, scale = 7)
    private BigDecimal checkpointLongitude;

    @Column(name = "radius_meters", nullable = false)
    @Builder.Default
    private Integer radiusMeters = DEFAULT_RADIUS_METERS;

    /** Thời gian thực hiện trải nghiệm (đếm ngược trên mobile). */
    @Column(name = "duration_seconds")
    private Integer durationSeconds;

    /** Câu hỏi sau trải nghiệm (đúng 1 câu; dùng List để cascade / orphanRemoval ổn định). */
    @OneToMany(mappedBy = "experience", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceOrder ASC")
    @Builder.Default
    private List<TourStopQuestion> questions = new ArrayList<>();

    public TourStopQuestion getQuestion() {
        return questions == null || questions.isEmpty() ? null : questions.get(0);
    }
}
