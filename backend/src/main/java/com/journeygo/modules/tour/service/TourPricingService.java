package com.journeygo.modules.tour.service;

import com.journeygo.modules.tour.dto.TourResponse;
import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.repository.TourPriceProjection;
import com.journeygo.modules.tour.repository.TourPriceRepository;
import com.journeygo.modules.tour.repository.TourRepository;
import com.journeygo.modules.tour.repository.TourRewardProjection;
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
    private final TourPriceRepository tourPriceRepository;

    @Transactional(readOnly = true)
    public TourResponse toResponse(Tour tour) {
        return mapperFor(List.of(tour)).apply(tour);
    }

    /** Một query cho cả danh sách tour, tránh N+1. */
    @Transactional(readOnly = true)
    public Function<Tour, TourResponse> mapperFor(Collection<Tour> tours) {
        List<Long> ids = tours.stream().map(Tour::getTourId).toList();
        if (ids.isEmpty()) return TourResponse::fromEntity;
        Map<Long, BigDecimal> totals = new java.util.HashMap<>(tourRepository.sumExperiencePricesByTourIds(ids).stream()
                .collect(Collectors.toMap(TourPriceProjection::tourId, TourPriceProjection::totalPrice)));
        // Tour tạo theo luồng 5 bước: giá hiển thị = giá vé người lớn.
        List<Long> wizardIds = tours.stream().filter(Tour::isWizardTour).map(Tour::getTourId).toList();
        if (!wizardIds.isEmpty()) {
            tourPriceRepository.findByTourIdsAndGuestType(wizardIds, GuestType.ADULT)
                    .forEach(p -> totals.put(p.getTour().getTourId(), p.getPrice()));
        }
        // Phần thưởng hiển thị trên thẻ tour: nhiệm vụ, điểm tối đa, huy hiệu (mỗi điểm đến một huy hiệu check-in)
        Map<Long, TourRewardProjection> rewards = tourRepository.sumTaskRewardsByTourIds(ids).stream()
                .collect(Collectors.toMap(TourRewardProjection::tourId, Function.identity()));
        Map<Long, Long> disabledBadges = tourRepository.countDisabledBadgesByTourIds(ids).stream()
                .collect(Collectors.toMap(row -> (Long) row[0], row -> (Long) row[1]));
        return tour -> {
            TourRewardProjection reward = rewards.get(tour.getTourId());
            long badges = tour.getDestinationCount() - disabledBadges.getOrDefault(tour.getTourId(), 0L);
            return TourResponse.fromEntity(tour)
                    .toBuilder()
                    .price(totals.getOrDefault(tour.getTourId(), BigDecimal.ZERO))
                    .taskCount(reward == null ? 0 : reward.taskCount().intValue())
                    .totalTaskPoints(reward == null ? 0 : reward.totalPoints().intValue())
                    .badgeCount((int) Math.max(0, badges))
                    .build();
        };
    }
}
