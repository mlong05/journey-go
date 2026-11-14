package com.journeygo.modules.tour.entity;

import jakarta.persistence.*;
import lombok.*;

import java.math.BigDecimal;

/** Bước 2 — giá vé của một loại khách. Mỗi tour có đúng 4 dòng (một dòng mỗi {@link GuestType}). */
@Entity
@Table(name = "tour_prices", uniqueConstraints = @UniqueConstraint(
        name = "uk_tour_prices_tour_guest", columnNames = {"tour_id", "guest_type"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourPrice {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tour_id", nullable = false)
    private Tour tour;

    @Enumerated(EnumType.STRING)
    @Column(name = "guest_type", nullable = false, length = 20)
    private GuestType guestType;

    /** Giá (VNĐ), không âm. Em bé luôn 0. */
    @Column(name = "price", nullable = false, precision = 12, scale = 2)
    @Builder.Default
    private BigDecimal price = BigDecimal.ZERO;

    /** Loại khách này có chiếm 1 chỗ trong slot hay không. */
    @Column(name = "counts_toward_slot", nullable = false)
    @Builder.Default
    private boolean countsTowardSlot = true;
}
