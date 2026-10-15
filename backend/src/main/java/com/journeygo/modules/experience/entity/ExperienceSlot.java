package com.journeygo.modules.experience.entity;

import com.journeygo.modules.experience.entity.enums.SlotStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.Instant;
import java.time.LocalDate;

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


    @Column(name = "max_tour_per_day", nullable = false)
    @Builder.Default
    private Integer maxTourPerDay = 0;


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
