package com.journeygo.modules.community.entity;

import com.journeygo.modules.community.entity.enums.PostStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "community_posts", indexes = {
        @Index(name = "idx_posts_author_id", columnList = "author_id"),
        @Index(name = "idx_posts_status", columnList = "status"),
        @Index(name = "idx_posts_tour_id", columnList = "tour_id"),
        @Index(name = "idx_posts_destination_id", columnList = "destination_id"),
        @Index(name = "idx_posts_created_at", columnList = "created_at")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CommunityPost {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "author_id", nullable = false)
    private Long authorId;

    @Column(name = "author_name", length = 150)
    private String authorName;

    @Column(name = "author_avatar_url", length = 500)
    private String authorAvatarUrl;

    @Column(name = "title", nullable = false, length = 255)
    private String title;

    @Column(name = "content", nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "tour_id")
    private Long tourId;

    @Column(name = "destination_id")
    private Long destinationId;

    @Column(name = "journey_id")
    private Long journeyId;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private PostStatus status = PostStatus.PENDING_REVIEW;

    @Column(name = "moderated_by")
    private Long moderatedBy;

    @Column(name = "moderated_at")
    private Instant moderatedAt;

    @Column(name = "moderation_note", length = 500)
    private String moderationNote;

    @Column(name = "likes_count", nullable = false)
    @Builder.Default
    private Integer likesCount = 0;

    @Column(name = "comments_count", nullable = false)
    @Builder.Default
    private Integer commentsCount = 0;

    @Column(name = "is_hidden", nullable = false)
    @Builder.Default
    private boolean hidden = false;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("orderIndex ASC")
    @Builder.Default
    private List<PostMedia> mediaList = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public void addMedia(PostMedia media) {
        mediaList.add(media);
        media.setPost(this);
    }
}
