package com.journeygo.modules.tour.service;

import com.journeygo.modules.tour.dto.TourResponse;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.repository.TourPriceProjection;
import com.journeygo.modules.tour.repository.TourRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Collection;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Giá tour không lưu trong DB: bằng tổng giá các Experience PUBLISHED
 * của những điểm đến nằm trong hành trình.
 */
@Service
@RequiredArgsConstructor
public class TourPricingService {

    private final TourRepository tourRepository;

    @Transactional(readOnly = true)
    public TourResponse toResponse(Tour tour) {
        return mapperFor(List.of(tour)).apply(tour);
    }

    /** Một query cho cả danh sách tour, tránh N+1. */
    @Transactional(readOnly = true)
    public Function<Tour, TourResponse> mapperFor(Collection<Tour> tours) {
        List<Long> ids = tours.stream().map(Tour::getTourId).toList();
        Map<Long, BigDecimal> totals = ids.isEmpty()
                ? Map.of()
                : tourRepository.sumExperiencePricesByTourIds(ids).stream()
                        .collect(Collectors.toMap(TourPriceProjection::tourId, TourPriceProjection::totalPrice));
        return tour -> TourResponse.fromEntity(tour)
                .toBuilder()
                .price(totals.getOrDefault(tour.getTourId(), BigDecimal.ZERO))
                .build();
    }
}
