package com.journeygo.modules.tour.entity;

import com.journeygo.modules.destination.entity.Destination;
import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "tour_destinations",
        uniqueConstraints = @UniqueConstraint(columnNames = {"tour_id", "destination_id"}))
@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TourDestination {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "tour_id", nullable = false)
    private Tour tour;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "destination_id", nullable = false)
    private Destination destination;

    /** 1-based display order of this destination within the tour. */
    @Column(name = "sequence_order", nullable = false)
    private int sequenceOrder;
}
