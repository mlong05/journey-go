package com.journeygo.modules.community.entity;

import com.journeygo.modules.community.entity.enums.ReactionType;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;

@Entity
@Table(name = "post_reactions", indexes = {
        @Index(name = "idx_reactions_post_id", columnList = "post_id"),
        @Index(name = "idx_reactions_user_id", columnList = "user_id")
}, uniqueConstraints = {
        @UniqueConstraint(name = "uk_post_user_reaction", columnNames = {"post_id", "user_id"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PostReaction {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "post_id", nullable = false)
    private Long postId;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Enumerated(EnumType.STRING)
    @Column(name = "reaction_type", nullable = false, length = 30)
    @Builder.Default
    private ReactionType reactionType = ReactionType.LIKE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}
