package com.journeygo.modules.tour.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Slot bán của tour theo ngày khởi hành — sinh khi Moderator duyệt tour.
 * Tour nhiều ngày: chỗ được giữ suốt các ngày của tour, slot gắn với ngày khởi hành.
 */
@Entity
@Table(name = "tour_slots", uniqueConstraints = @UniqueConstraint(
        name = "uk_tour_slots_tour_date", columnNames = {"tour_id", "slot_date"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tour_id", nullable = false)
    private Tour tour;

    @Column(name = "slot_date", nullable = false)
    private LocalDate slotDate;

    /** Lấy theo "Số chỗ tối đa mỗi slot" ở bước 2. */
    @Column(name = "capacity", nullable = false)
    private Integer capacity;

    @Column(name = "booked_count", nullable = false)
    @Builder.Default
    private Integer bookedCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false, length = 20)
    @Builder.Default
    private TourSlotStatus status = TourSlotStatus.OPEN;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }

    public boolean hasBookings() {
        return bookedCount != null && bookedCount > 0;
    }
}
