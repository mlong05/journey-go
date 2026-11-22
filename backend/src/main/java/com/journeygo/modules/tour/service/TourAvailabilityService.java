package com.journeygo.modules.tour.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.experience.entity.ExperienceSlot;
import com.journeygo.modules.experience.repository.ExperienceRepository;
import com.journeygo.modules.experience.repository.ExperienceSlotRepository;
import com.journeygo.modules.tour.dto.TourSlotAvailabilityResponse;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourSlot;
import com.journeygo.modules.tour.entity.TourSlotStatus;
import com.journeygo.modules.tour.repository.TourRepository;
import com.journeygo.modules.tour.repository.TourSlotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Tính SỐ CHỗ CÒN theo từng ngày trải nghiệm của một tour.
 *
 * <p>Đây là nguồn sự thật duy nhất cho UI "Số chỗ còn — Còn N chỗ" (web + mobile).
 *
 * <p>Khái niệm "chỗ" (theo tài liệu "Đặt - Thanh toán tour"):
 * <ul>
 *   <li>Tour luồng 5 bước: mỗi ngày khởi hành có một {@link TourSlot} với
 *       {@code capacity} (do đối tác thiết lập ở bước 2) và {@code bookedCount}
 *       (số chỗ đã giữ). Số chỗ còn = {@code capacity - bookedCount}.</li>
 *   <li>Tour luồng cũ: dùng {@link ExperienceSlot} (sức chứa theo trải nghiệm);
 *       số chỗ còn của ngày = số chỗ còn NHỎ NHẤT giữa các trải nghiệm của tour
 *       (đúng bản chất luồng booking cũ: mỗi booking chiếm 1 slot trên mọi experience).</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TourAvailabilityService {

    private final TourRepository tourRepository;
    private final TourSlotRepository tourSlotRepository;
    private final ExperienceSlotRepository experienceSlotRepository;
    private final ExperienceRepository experienceRepository;

    /**
     * Số chỗ còn của tour theo từng ngày (chỉ tính ngày từ hôm nay trở đi).
     */
    @Transactional(readOnly = true)
    public TourSlotAvailabilityResponse getAvailability(Long tourId) {
        Tour tour = tourRepository.findByTourId(tourId)
                .orElseThrow(() -> new AppException(ErrorCode.TOUR_NOT_FOUND));

        LocalDate today = LocalDate.now(TourSubmissionValidator.ZONE);
        List<TourSlotAvailabilityResponse.DateAvailability> dates = tour.isWizardTour()
                ? wizardAvailability(tour, today)
                : legacyAvailability(tour, today);

        return TourSlotAvailabilityResponse.builder()
                .tourId(tour.getTourId())
                .wizardTour(tour.isWizardTour())
                .dates(dates)
                .build();
    }

    /**
     * Số chỗ còn theo ngày của NHIỀU tour trong khoảng [{@code from}, {@code to}] — dùng cho lịch khởi hành.
     *
     * <p>Tour luồng 5 bước: một truy vấn duy nhất lấy slot của mọi tour trong khoảng (không N+1).
     * Tour luồng cũ (ít): tính từng tour bằng đúng logic của {@link #getAvailability}.
     * Cách tính số chỗ còn giống hệt {@link #getAvailability} để lịch và màn đặt tour luôn khớp nhau.
     *
     * @return tourId → các ngày trong khoảng (đã sắp tăng dần); tour không có ngày nào thì không có khóa
     */
    @Transactional(readOnly = true)
    public Map<Long, List<TourSlotAvailabilityResponse.DateAvailability>> availabilityBetween(
            Collection<Tour> tours, LocalDate from, LocalDate to) {
        Map<Long, List<TourSlotAvailabilityResponse.DateAvailability>> result = new HashMap<>();
        if (tours.isEmpty() || to.isBefore(from)) {
            return result;
        }

        List<Long> wizardIds = tours.stream().filter(Tour::isWizardTour).map(Tour::getTourId).toList();
        if (!wizardIds.isEmpty()) {
            for (TourSlot slot : tourSlotRepository.findByTourIdsBetween(wizardIds, from, to)) {
                result.computeIfAbsent(slot.getTour().getTourId(), id -> new ArrayList<>()).add(toAvailability(slot));
            }
        }

        for (Tour tour : tours) {
            if (tour.isWizardTour()) {
                continue;
            }
            List<TourSlotAvailabilityResponse.DateAvailability> dates = legacyAvailability(tour, from).stream()
                    .filter(d -> !d.date().isAfter(to))
                    .toList();
            if (!dates.isEmpty()) {
                result.put(tour.getTourId(), dates);
            }
        }
        return result;
    }

    /**
     * Tour luồng 5 bước — số chỗ còn lấy thẳng từ {@link TourSlot} của từng ngày.
     */
    private List<TourSlotAvailabilityResponse.DateAvailability> wizardAvailability(Tour tour, LocalDate today) {
        List<TourSlot> slots = tourSlotRepository.findByTour_TourIdOrderBySlotDateAsc(tour.getTourId());
        List<TourSlotAvailabilityResponse.DateAvailability> result = new ArrayList<>();
        for (TourSlot slot : slots) {
            if (slot.getSlotDate().isBefore(today)) {
                continue;
            }
            result.add(toAvailability(slot));
        }
        return result;
    }

    /** Số chỗ còn của một {@link TourSlot}: capacity - bookedCount; đặt được khi slot mở và còn chỗ. */
    private static TourSlotAvailabilityResponse.DateAvailability toAvailability(TourSlot slot) {
        int capacity = slot.getCapacity() == null ? 0 : slot.getCapacity();
        int booked = slot.getBookedCount() == null ? 0 : slot.getBookedCount();
        int remaining = Math.max(0, capacity - booked);
        boolean available = slot.getStatus() == TourSlotStatus.OPEN && remaining > 0;
        return TourSlotAvailabilityResponse.DateAvailability.builder()
                .date(slot.getSlotDate())
                .capacity(capacity)
                .bookedCount(booked)
                .remaining(remaining)
                .available(available)
                .build();
    }

    /**
     * Tour luồng cũ — gom slot của các trải nghiệm trong tour theo ngày.
     *
     * <p>Số chỗ còn của một ngày = MIN(remaining) giữa các trải nghiệm, vì booking của
     * tour luồng cũ chiếm 1 slot trên MỌI experience của tour.
     */
    private List<TourSlotAvailabilityResponse.DateAvailability> legacyAvailability(Tour tour, LocalDate today) {
        List<Long> destinationIds = tour.getTourDestinations() == null
                ? List.of()
                : tour.getTourDestinations().stream()
                .map(td -> td.getDestination())
                .filter(d -> d != null)
                .map(d -> d.getId())
                .toList();
        if (destinationIds.isEmpty()) {
            return List.of();
        }

        List<Long> experienceIds = experienceRepository
                .findByDestination_IdInOrderById(destinationIds).stream()
                .map(e -> e.getId())
                .toList();
        if (experienceIds.isEmpty()) {
            return List.of();
        }

        Map<LocalDate, List<ExperienceSlot>> byDate = new LinkedHashMap<>();
        for (ExperienceSlot slot : experienceSlotRepository.findByExperienceIds(experienceIds)) {
            if (slot.getSlotDate().isBefore(today)) {
                continue;
            }
            byDate.computeIfAbsent(slot.getSlotDate(), d -> new ArrayList<>()).add(slot);
        }

        List<TourSlotAvailabilityResponse.DateAvailability> result = new ArrayList<>();
        for (Map.Entry<LocalDate, List<ExperienceSlot>> entry : byDate.entrySet()) {
            List<ExperienceSlot> slots = entry.getValue();
            int remaining = slots.stream()
                    .mapToInt(s -> Math.max(0, s.getMaxTourPerDay() - s.getBookedTourCount()))
                    .min()
                    .orElse(0);
            int capacity = slots.stream().mapToInt(ExperienceSlot::getMaxTourPerDay).sum();
            int booked = slots.stream().mapToInt(ExperienceSlot::getBookedTourCount).sum();
            result.add(TourSlotAvailabilityResponse.DateAvailability.builder()
                    .date(entry.getKey())
                    .capacity(capacity)
                    .bookedCount(booked)
                    .remaining(remaining)
                    .available(remaining > 0)
                    .build());
        }
        result.sort((a, b) -> a.date().compareTo(b.date()));
        return result;
    }
}
