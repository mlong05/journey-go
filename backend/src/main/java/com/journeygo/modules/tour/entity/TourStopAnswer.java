package com.journeygo.modules.tour.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tour_stop_answers")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourStopAnswer {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "question_id", nullable = false)
    private TourStopQuestion question;

    @Column(name = "sequence_order", nullable = false)
    private int sequenceOrder;

    @Column(name = "content", columnDefinition = "TEXT")
    private String content;

    @Column(name = "is_correct", nullable = false)
    @Builder.Default
    private boolean correct = false;
}
