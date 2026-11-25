package com.journeygo.common.i18n;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

/**
 * Bản dịch cache tổng quát cho các thực thể động (REGION, THEME, TOUR_SUMMARY,
 * STOP_CULTURE, TASK_QUESTIONS, PUZZLE_CLUE) theo ngôn ngữ (en / ja).
 */
@Entity
@Table(name = "content_translations", uniqueConstraints = {
        @UniqueConstraint(name = "uq_content_translations_entity_locale",
                columnNames = {"entity_type", "entity_id", "locale"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContentTranslation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "entity_type", nullable = false, length = 40)
    private String entityType;

    @Column(name = "entity_id", nullable = false)
    private Long entityId;

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
