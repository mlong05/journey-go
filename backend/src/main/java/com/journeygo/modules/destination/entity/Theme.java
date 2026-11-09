package com.journeygo.modules.destination.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.util.HashSet;
import java.util.Set;

@Entity
@Table(name = "themes", indexes = {
        @Index(name = "idx_themes_slug", columnList = "slug", unique = true)
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Theme {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, unique = true, length = 150)
    private String slug;

    /** Ảnh đại diện chủ đề (ảnh chụp thật), hiện ở trang chủ app du khách. */
    @Column(name = "image_url", length = 1000)
    private String imageUrl;

    /** Ghi nguồn ảnh (tác giả · giấy phép) khi ảnh không phải của JourneyGo; trống nếu là ảnh tự chụp. */
    @Column(name = "image_credit", length = 300)
    private String imageCredit;

    @JsonIgnore
    @ManyToMany(mappedBy = "themes", fetch = FetchType.LAZY)
    @Builder.Default
    private Set<Destination> destinations = new HashSet<>();

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
}
