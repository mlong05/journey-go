package com.journeygo.modules.tour.repository;

import com.journeygo.modules.tour.entity.TourSlot;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface TourSlotRepository extends JpaRepository<TourSlot, Long> {

    List<TourSlot> findByTour_TourIdOrderBySlotDateAsc(Long tourId);
}
