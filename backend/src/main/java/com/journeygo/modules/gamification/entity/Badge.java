package com.journeygo.modules.gamification.entity;

import com.journeygo.modules.gamification.entity.enums.BadgeType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "badges", indexes = {
        @Index(name = "idx_badges_code", columnList = "code", unique = true),
        @Index(name = "idx_badges_destination_id", columnList = "destination_id"),
        @Index(name = "idx_badges_type", columnList = "badge_type")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Badge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "code", nullable = false, unique = true, length = 100)
    private String code;

    @Column(name = "name", nullable = false, length = 150)
    private String name;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "icon_url", length = 500)
    private String iconUrl;

    @Column(name = "destination_id")
    private Long destinationId;

    @Enumerated(EnumType.STRING)
    @Column(name = "badge_type", nullable = false, length = 30)
    @Builder.Default
    private BadgeType badgeType = BadgeType.DESTINATION_CHECKIN;

    @Column(name = "bonus_points", nullable = false)
    @Builder.Default
    private Integer bonusPoints = 0;

    @Column(name = "is_active", nullable = false)
    @Builder.Default
    private boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}
