package com.journeygo.modules.experience.entity;

import com.journeygo.modules.experience.entity.enums.ExperienceStatus;
import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.ArrayList;
import java.util.List;

/**
 * Entity chính của module Experience.
 *
 * Theo CONTEXT §3 mới:
 *   - destination_id BIGINT NOT NULL UNIQUE (1 Experience ↔ 1 Destination — BR-EXP-1).
 *   - status VARCHAR(20) NOT NULL DEFAULT 'DRAFT'.
 *   - KHÔNG có ExperienceType: mỗi Experience mặc định gồm cả 2 phần (Quiz + Real-world Interactive)
 *     thông qua danh sách Task.
 *
 * Quan hệ:
 *   - 1 Experience có nhiều Task (cascade khi tạo xóa Experience).
 *   - 1 Experience có nhiều CheckInPoint (cho task GPS/QR).
 *   - 1 Experience có nhiều ExperienceSlot (khung giờ mở bán).
 *   - Destination chỉ là FK long (không @ManyToOne — Destination thuộc module khác, lookup qua destinationRepository).
 *
 * Lưu ý: KHÔNG có field needsPartnerConfirmation / moderatedBy / moderationReason
 * vì moderation workflow cần chờ content cultural từ module destination.
 * Khi có sẽ thêm lại.
 */
@Entity
@Table(name = "experience", uniqueConstraints = {
        @UniqueConstraint(name = "uk_experience_destination", columnNames = "destination_id")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Experience {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "destination_id", nullable = false)
    private Long destinationId;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal price = BigDecimal.ZERO;

    @Column(nullable = false, length = 3)
    @Builder.Default
    private String currency = "VND";

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ExperienceStatus status = ExperienceStatus.DRAFT;

    /** User tạo Experience (Content Provider — Role.PROVIDER). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by")
    private User createdBy;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at")
    private Instant updatedAt;

    // ── Quan hệ 1-N (mapped ở đây để cascade hợp lý) ────────────────────────

    @OneToMany(mappedBy = "experience", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("sequenceOrder ASC")
    @Builder.Default
    private List<Task> tasks = new ArrayList<>();

    @OneToMany(mappedBy = "experience", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @OrderBy("sequenceOrder ASC")
    @Builder.Default
    private List<CheckInPoint> checkInPoints = new ArrayList<>();

    @OneToMany(mappedBy = "experience", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @Builder.Default
    private List<ExperienceSlot> slots = new ArrayList<>();

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
