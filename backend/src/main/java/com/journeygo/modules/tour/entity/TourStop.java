package com.journeygo.modules.tour.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Bước 3 — một điểm đến riêng của tour (không dùng danh mục điểm đến chung).
 * Các trường để trống được khi lưu nháp; kiểm tra đầy đủ lúc gửi duyệt.
 */
@Entity
@Table(name = "tour_stops", indexes = @Index(name = "idx_tour_stops_tour_seq", columnList = "tour_id, sequence_order"))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourStop {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tour_id", nullable = false)
    private Tour tour;

    /** Thứ tự theo kéo thả, bắt đầu từ 1. */
    @Column(name = "sequence_order", nullable = false)
    private int sequenceOrder;

    @Column(name = "name", length = 200)
    private String name;

    @Column(name = "short_description", columnDefinition = "TEXT")
    private String shortDescription;

    /** Lưu ý cho khách — không bắt buộc. */
    @Column(name = "guest_note", columnDefinition = "TEXT")
    private String guestNote;

    /** Ảnh riêng — không bắt buộc. */
    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    /** Video giới thiệu điểm đến — không bắt buộc, hiển thị phía trên nội dung văn hóa. */
    @Column(name = "video_url", length = 1000)
    private String videoUrl;

    @Enumerated(EnumType.STRING)
    @Column(name = "video_source", length = 20)
    private VideoSource videoSource;

    /** Nội dung văn hóa (câu chuyện) — chỉ mở cho khách sau khi check-in tại điểm. */
    @Column(name = "cultural_content", columnDefinition = "TEXT")
    private String culturalContent;

    @ElementCollection
    @CollectionTable(name = "tour_stop_cultural_images", joinColumns = @JoinColumn(name = "stop_id"))
    @OrderColumn(name = "position")
    @Column(name = "image_url", length = 1000, nullable = false)
    @Builder.Default
    private List<String> culturalImages = new ArrayList<>();

    @OneToMany(mappedBy = "stop", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceOrder ASC")
    @Builder.Default
    private List<TourStopArtifact> artifacts = new ArrayList<>();

    /** Nhiệm vụ của điểm đến (1–5); mỗi nhiệm vụ gồm quiz và trải nghiệm thực tế. */
    @OneToMany(mappedBy = "stop", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceOrder ASC")
    @Builder.Default
    private List<TourStopTask> tasks = new ArrayList<>();

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
