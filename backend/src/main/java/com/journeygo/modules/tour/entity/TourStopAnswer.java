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

    /** Câu nối cột: nội dung cột B ghép đúng với dòng này (content = cột A). */
    @Column(name = "match_text", length = 1000)
    private String matchText;

    /** Câu chọn ảnh: ảnh của đáp án. Câu nối cột: ảnh kèm cột A. */
    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    @Column(name = "is_correct", nullable = false)
    @Builder.Default
    private boolean correct = false;
}
