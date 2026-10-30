package com.journeygo.modules.content.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.journeygo.modules.destination.entity.Destination;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "cultural_contents", indexes = {
        @Index(name = "idx_contents_dest_seq", columnList = "destination_id, sequence_order")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CulturalContent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "content_type", nullable = false, length = 50)
    private String contentType;

    @Column(name = "sequence_order", nullable = false)
    @Builder.Default
    private int sequenceOrder = 0;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(columnDefinition = "TEXT")
    private String contentText;

    @JsonIgnore
    @Column(name = "media_url", length = 1000)
    private String mediaUrl;

    @Column(name = "media_public_id", length = 255)
    private String mediaPublicId;

    @Column(name = "duration")
    private Integer duration; // Duration in seconds for audio/video

    /** Thư viện ảnh kèm theo nội dung, giữ đúng thứ tự người tạo sắp xếp */
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "cultural_content_images", joinColumns = @JoinColumn(name = "content_id"))
    @OrderColumn(name = "position")
    @Column(name = "image_url", length = 1000, nullable = false)
    @Builder.Default
    private List<String> imageUrls = new ArrayList<>();

    @JsonIgnore
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_id", nullable = false)
    private Destination destination;

    @Column(name = "play_count", nullable = false)
    @Builder.Default
    private long playCount = 0L;

    @Column(nullable = false)
    @Builder.Default
    private boolean deleted = false;

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

    /** Increment play count when played */
    public void incrementPlayCount() {
        this.playCount++;
    }
}
