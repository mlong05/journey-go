package com.journeygo.modules.tour.repository;

import com.journeygo.modules.tour.entity.TourTranslation;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

public interface TourTranslationRepository extends JpaRepository<TourTranslation, Long> {
    Optional<TourTranslation> findByTourIdAndLocale(Long tourId, String locale);

    List<TourTranslation> findByLocaleAndTourIdIn(String locale, Collection<Long> tourIds);
}
