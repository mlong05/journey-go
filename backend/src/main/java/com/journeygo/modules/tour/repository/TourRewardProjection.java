package com.journeygo.modules.tour.repository;

/**
 * Tổng hợp phần thưởng của một tour: số nhiệm vụ đang mở và tổng điểm thưởng tối đa của chúng.
 *
 * @param tourId      ID tour
 * @param taskCount   Số nhiệm vụ PUBLISHED trong các Experience PUBLISHED của các điểm đến
 * @param totalPoints Tổng pointsReward của các nhiệm vụ đó
 */
public record TourRewardProjection(Long tourId, Long taskCount, Long totalPoints) {
}
