package com.journeygo.modules.tour.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Bản dịch cache cho nội dung công khai của một tour theo ngôn ngữ (en / ja).
 * {@code sourceHash} (SHA-256) giúp tự động phát hiện khi đối tác chỉnh sửa tour để dịch lại.
 */
@Entity
@Table(name = "tour_translations", uniqueConstraints = {
        @UniqueConstraint(name = "uq_tour_translations_tour_locale", columnNames = {"tour_id", "locale"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourTranslation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "tour_id", nullable = false)
    private Long tourId;

    @Column(name = "locale", nullable = false, length = 5)
    private String locale;

    @Column(name = "source_hash", nullable = false, length = 64)
    private String sourceHash;

    @Column(name = "translated_json", nullable = false, columnDefinition = "TEXT")
    private String translatedJson;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        Instant now = Instant.now();
        this.createdAt = now;
        this.updatedAt = now;
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
