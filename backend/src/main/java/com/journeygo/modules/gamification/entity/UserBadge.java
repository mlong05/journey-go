package com.journeygo.modules.gamification.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "user_badges", indexes = {
        @Index(name = "idx_user_badges_user_id", columnList = "user_id"),
        @Index(name = "idx_user_badges_badge_id", columnList = "badge_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_user_badge", columnNames = {"user_id", "badge_id"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserBadge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "badge_id", nullable = false)
    private Badge badge;

    @Column(name = "journey_id")
    private Long journeyId;

    @Column(name = "destination_id")
    private Long destinationId;

    @Column(name = "earned_at", nullable = false, updatable = false)
    private Instant earnedAt;

    @PrePersist
    protected void onCreate() {
        this.earnedAt = Instant.now();
    }
}
