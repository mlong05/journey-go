package com.journeygo.modules.destination.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import com.journeygo.modules.content.entity.CulturalContent;
import com.journeygo.modules.destination.entity.enums.DestinationStatus;
import com.journeygo.modules.experience.entity.Experience;
import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "destinations")
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Destination {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private String address;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(nullable = false, precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(nullable = false)
    private Integer capacity;

    /** Ảnh bìa (URL https trên Cloudinary) hiển thị trên thẻ tour và chi tiết hành trình của app. */
    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @Column(nullable = false, columnDefinition = "integer default 0 not null")
    @Builder.Default
    private Integer booked = 0;

    @Column(nullable = false)
    @Builder.Default
    private boolean approved = false;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30, columnDefinition = "varchar(30) default 'DRAFT'")
    @Builder.Default
    private DestinationStatus status = DestinationStatus.DRAFT;

    @Column(nullable = false)
    @Builder.Default
    private boolean deleted = false;

    /**
     * Mã in trên QR dán tại cổng điểm đến; du khách quét để check-in thay cho GPS.
     * Bí mật nghiệp vụ: không trả qua API công khai, chỉ chủ điểm đến / ADMIN / MODERATOR xem được.
     */
    @Column(name = "qr_token", unique = true, length = 64)
    private String qrToken;

    @Column(name = "region_id", insertable = false, updatable = false)
    private Long regionId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "region_id")
    private Region region;

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "destination_themes",
            joinColumns = @JoinColumn(name = "destination_id"),
            inverseJoinColumns = @JoinColumn(name = "theme_id")
    )
    @Builder.Default
    private Set<Theme> themes = new HashSet<>();

    @JsonIgnore
    @OneToMany(mappedBy = "destination", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequenceOrder ASC")
    @Builder.Default
    private List<CulturalContent> contents = new ArrayList<>();

    @JsonIgnore
    @OneToMany(mappedBy = "destination", fetch = FetchType.LAZY)
    @Builder.Default
    private List<Experience> experiences = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        if (this.status == null) {
            this.status = this.approved ? DestinationStatus.PUBLISHED : DestinationStatus.DRAFT;
        }
        if (this.qrToken == null) {
            this.qrToken = newQrToken();
        }
    }

    /** Sinh mã QR ngẫu nhiên, dễ đọc để nhập tay khi camera không dùng được: JGD-XXXXXXXXXXXXXXXX. */
    public static String newQrToken() {
        return "JGD-" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }

    public Long getRegionId() {
        if (this.region != null && this.region.getId() != null) {
            return this.region.getId();
        }
        return this.regionId;
    }

    public void setRegion(Region region) {
        this.region = region;
        this.regionId = region != null ? region.getId() : null;
    }

}
