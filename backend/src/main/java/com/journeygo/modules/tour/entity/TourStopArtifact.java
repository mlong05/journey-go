package com.journeygo.modules.tour.entity;

import jakarta.persistence.*;
import lombok.*;

/** Cổ vật tại điểm đến: ảnh, mô tả ngắn, video. */
@Entity
@Table(name = "tour_stop_artifacts")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourStopArtifact {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "stop_id", nullable = false)
    private TourStop stop;

    @Column(name = "sequence_order", nullable = false)
    private int sequenceOrder;

    @Column(name = "name", length = 200)
    private String name;

    /** Ảnh JPG / PNG. */
    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    @Column(name = "short_description", columnDefinition = "TEXT")
    private String shortDescription;

    @Column(name = "video_url", length = 1000)
    private String videoUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "video_source", length = 20)
    private VideoSource videoSource;
}
