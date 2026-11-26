package com.journeygo.modules.tourmerge.entity;

import com.journeygo.modules.tour.entity.TourSlot;
import com.journeygo.modules.tourmerge.entity.enums.TourMergeStatus;
import com.journeygo.modules.user.entity.User;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Bản ghi ghép tour B2B 1-1 giữa 2 TourSlot có chung chặng đầu.
 *
 * <p>Vận hành chung (giờ xuất phát, điểm tập trung, tổng sức chứa phương tiện) được quản lý
 * tách biệt tại bảng này; bảng {@code bookings} gốc và dòng tiền của từng Provider không thay đổi.
 */
@Entity
@Table(name = "tour_merges", indexes = {
        @Index(name = "idx_tour_merges_host_slot", columnList = "host_slot_id"),
        @Index(name = "idx_tour_merges_guest_slot", columnList = "guest_slot_id"),
        @Index(name = "idx_tour_merges_status", columnList = "status"),
        @Index(name = "idx_tour_merges_initiator", columnList = "initiator_provider_id, status"),
        @Index(name = "idx_tour_merges_target", columnList = "target_provider_id, status")
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourMerge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "host_slot_id", nullable = false)
    private TourSlot hostSlot;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "guest_slot_id", nullable = false)
    private TourSlot guestSlot;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "initiator_provider_id", nullable = false)
    private User initiatorProvider;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "target_provider_id", nullable = false)
    private User targetProvider;

    @Column(name = "departure_date", nullable = false)
    private LocalDate departureDate;

    @Column(name = "merged_departure_time", nullable = false)
    private LocalTime mergedDepartureTime;

    @Column(name = "merged_meeting_point", nullable = false, columnDefinition = "TEXT")
    private String mergedMeetingPoint;

    @Column(name = "merged_capacity", nullable = false)
    private Integer mergedCapacity;

    @Column(name = "target_confirmed", nullable = false)
    @Builder.Default
    private boolean targetConfirmed = false;

    @Column(name = "target_confirmed_at")
    private Instant targetConfirmedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 30)
    @Builder.Default
    private TourMergeStatus status = TourMergeStatus.PENDING_PROVIDER;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "approved_by_mod_id")
    private User approvedByMod;

    @Column(name = "note", columnDefinition = "TEXT")
    private String note;

    @Column(name = "reject_reason", columnDefinition = "TEXT")
    private String rejectReason;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @Column(name = "updated_at", nullable = false)
    private Instant updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
        this.updatedAt = Instant.now();
        if (this.status == null) {
            this.status = TourMergeStatus.PENDING_PROVIDER;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = Instant.now();
    }
}
