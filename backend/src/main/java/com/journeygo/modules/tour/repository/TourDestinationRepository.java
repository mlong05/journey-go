package com.journeygo.modules.tour.repository;

import com.journeygo.modules.tour.entity.TourDestination;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TourDestinationRepository extends JpaRepository<TourDestination, Long> {

    List<TourDestination> findByTour_TourIdOrderBySequenceOrderAsc(Long tourId);

    void deleteByTour_TourId(Long tourId);
}
