package com.journeygo.modules.experience.entity;

import com.journeygo.modules.experience.entity.enums.SlotStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

/**
 * Phân bổ quota PLATFORM cho một Experience theo ngày (đếm theo TOUR, không theo người).
 *
 * Vì Experience 1-1 Destination (experience.destinationId UNIQUE), nên check quota
 * ExperienceSlot ngầm định check quota cho cả Destination tương ứng — không cần
 * bảng destination_slot riêng.
 *
 * Quy tắc:
 *   - 1 Experience có thể có nhiều ExperienceSlot theo từng ngày.
 *   - (experience_id, slot_date) UNIQUE.
 *   - Partner/Admin phân bổ quota = số TOUR tối đa/ngày dính tới experience (và destination của nó).
 *   - Platform đếm theo TOUR (đơn vị bán). Sức chứa vật lý (số người) Partner tự quản lý.
 *   - Status:
 *       AVAILABLE: còn quota
 *       SOLD_OUT: hết quota platform
 *       PAUSED: tạm dừng bán
 *       CLOSED: đóng (ngày đã qua hoặc admin đóng)
 */
@Entity
@Table(name = "experience_slot", uniqueConstraints = {
        @UniqueConstraint(name = "uk_experience_slot_date", columnNames = {"experience_id", "slot_date"})
})
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExperienceSlot {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "experience_id", nullable = false)
    private Experience experience;

    @Column(name = "slot_date", nullable = false)
    private LocalDate slotDate;

    /** Số TOUR tối đa platform phân bổ cho trải nghiệm này trong ngày (đơn vị đếm = tour, không phải người). */
    @Column(name = "max_tour_per_day", nullable = false)
    @Builder.Default
    private Integer maxTourPerDay = 0;

    /** Số TOUR đã bán. Module Booking sẽ update. */
    @Column(name = "booked_tour_count", nullable = false)
    @Builder.Default
    private Integer bookedTourCount = 0;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private SlotStatus status = SlotStatus.AVAILABLE;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = Instant.now();
    }
}