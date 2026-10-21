package com.journeygo.modules.gamification.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "user_points", indexes = {
        @Index(name = "idx_user_points_user_id", columnList = "user_id", unique = true)
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserPoint {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false, unique = true)
    private Long userId;

    @Column(name = "current_balance", nullable = false)
    @Builder.Default
    private Integer currentBalance = 0;

    @Column(name = "lifetime_earned", nullable = false)
    @Builder.Default
    private Integer lifetimeEarned = 0;

    @Column(name = "lifetime_spent", nullable = false)
    @Builder.Default
    private Integer lifetimeSpent = 0;

    @Version
    @Column(name = "version")
    private Long version;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
