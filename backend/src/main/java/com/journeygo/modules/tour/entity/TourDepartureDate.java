package com.journeygo.modules.tour.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

/** Bước 4 — một ngày khởi hành được chọn trên lịch. Khi tour được duyệt sẽ sinh {@link TourSlot}. */
@Entity
@Table(name = "tour_departure_dates", uniqueConstraints = @UniqueConstraint(
        name = "uk_tour_departure_dates", columnNames = {"tour_id", "departure_date"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourDepartureDate {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "tour_id", nullable = false)
    private Tour tour;

    @Column(name = "departure_date", nullable = false)
    private LocalDate departureDate;
}
