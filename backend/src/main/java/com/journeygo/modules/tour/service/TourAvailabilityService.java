package com.journeygo.modules.tour.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.experience.entity.Experience;
import com.journeygo.modules.experience.entity.ExperienceSlot;
import com.journeygo.modules.experience.repository.ExperienceRepository;
import com.journeygo.modules.experience.repository.ExperienceSlotRepository;
import com.journeygo.modules.tour.dto.TourSlotAvailabilityResponse;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourSlot;
import com.journeygo.modules.tour.entity.TourSlotStatus;
import com.journeygo.modules.tour.repository.TourRepository;
import com.journeygo.modules.tour.repository.TourSlotRepository;
import com.journeygo.modules.tourmerge.entity.TourMerge;
import com.journeygo.modules.tourmerge.repository.TourMergeRepository;
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
    private final TourMergeRepository tourMergeRepository;

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
            List<TourSlot> slots = tourSlotRepository.findByTourIdsBetween(wizardIds, from, to);
            Map<Long, TourMerge> approvedMerges = loadApprovedMergesBySlotId(slots);
            for (TourSlot slot : slots) {
                result.computeIfAbsent(slot.getTour().getTourId(), id -> new ArrayList<>())
                        .add(toAvailability(slot, approvedMerges.get(slot.getId())));
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
        List<TourSlot> slots = tourSlotRepository.findByTour_TourIdOrderBySlotDateAsc(tour.getTourId()).stream()
                .filter(slot -> !slot.getSlotDate().isBefore(today))
                .toList();
        Map<Long, TourMerge> approvedMerges = loadApprovedMergesBySlotId(slots);
        List<TourSlotAvailabilityResponse.DateAvailability> result = new ArrayList<>(slots.size());
        for (TourSlot slot : slots) {
            result.add(toAvailability(slot, approvedMerges.get(slot.getId())));
        }
        return result;
    }

    /** Số chỗ còn của một {@link TourSlot} (tính trần {@code mergedCapacity} nếu slot đang thuộc đoàn ghép APPROVED). */
    private static TourSlotAvailabilityResponse.DateAvailability toAvailability(TourSlot slot, TourMerge merge) {
        int capacity;
        int booked;
        if (merge != null) {
            capacity = merge.getMergedCapacity() == null ? 0 : merge.getMergedCapacity();
            int hostBooked = merge.getHostSlot() != null && merge.getHostSlot().getBookedCount() != null
                    ? merge.getHostSlot().getBookedCount() : 0;
            int guestBooked = merge.getGuestSlot() != null && merge.getGuestSlot().getBookedCount() != null
                    ? merge.getGuestSlot().getBookedCount() : 0;
            booked = hostBooked + guestBooked;
        } else {
            capacity = slot.getCapacity() == null ? 0 : slot.getCapacity();
            booked = slot.getBookedCount() == null ? 0 : slot.getBookedCount();
        }
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

    private Map<Long, TourMerge> loadApprovedMergesBySlotId(List<TourSlot> slots) {
        if (slots == null || slots.isEmpty()) {
            return Map.of();
        }
        List<Long> slotIds = slots.stream().map(TourSlot::getId).filter(java.util.Objects::nonNull).distinct().toList();
        if (slotIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, TourMerge> map = new HashMap<>();
        for (TourMerge merge : tourMergeRepository.findApprovedBySlotIds(slotIds)) {
            if (merge.getHostSlot() != null) {
                map.put(merge.getHostSlot().getId(), merge);
            }
            if (merge.getGuestSlot() != null) {
                map.put(merge.getGuestSlot().getId(), merge);
            }
        }
        return map;
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

    /**
     * Ngày khởi hành gần nhất CÓ THỂ ĐẶT của nhiều tour (tính từ hôm nay).
     *
     * <p>Áp dụng cho CẢ HAI luồng tạo tour:
     * <ul>
     *   <li>Tour luồng 5 bước: ngày đầu tiên trong {@link TourSlot} còn mở và còn chỗ;</li>
     *   <li>Tour luồng cũ: ngày đầu tiên mà các {@link ExperienceSlot} của tour
     *       còn chỗ (cùng logic với {@link #legacyAvailability}).</li>
     * </ul>
     *
     * <p>⚠️ Trước đây {@code nextDepartureDate} CHỈ được tính cho tour luồng 5 bước ⇒ tour luồng cũ
     * luôn có {@code nextDepartureDate = null} và bị ẩn khỏi danh sách "Tất cả tour" của du khách
     * (frontend lọc {@code t.nextDepartureDate}), dù tour vẫn còn ngày đi trong tương lai.
     *
     * @return tourId → ngày khởi hành gần nhất (bỏ qua tour không còn ngày nào đặt được)
     */
    @Transactional(readOnly = true)
    public Map<Long, LocalDate> nextDepartureDates(Collection<Tour> tours) {
        Map<Long, LocalDate> result = new HashMap<>();
        if (tours == null || tours.isEmpty()) {
            return result;
        }
        LocalDate today = LocalDate.now(TourSubmissionValidator.ZONE);

        // Tour luồng 5 bước: một truy vấn duy nhất cho mọi tour.
        List<Long> wizardIds = tours.stream().filter(Tour::isWizardTour).map(Tour::getTourId).toList();
        if (!wizardIds.isEmpty()) {
            List<TourSlot> slots = tourSlotRepository.findByTourIdsBetween(
                    wizardIds, today, today.plusDays(MAX_LOOKAHEAD_DAYS));
            Map<Long, TourMerge> approvedMerges = loadApprovedMergesBySlotId(slots);
            for (TourSlot slot : slots) {
                if (slot.getStatus() != TourSlotStatus.OPEN) continue;
                TourSlotAvailabilityResponse.DateAvailability avail =
                        toAvailability(slot, approvedMerges.get(slot.getId()));
                if (avail.remaining() <= 0) continue;
                result.merge(slot.getTour().getTourId(), slot.getSlotDate(),
                        (a, b) -> a.isBefore(b) ? a : b);
            }
        }

        // Tour luồng cũ: gom slot của TẤT CẢ trải nghiệm của các tour luồng cũ trong 1 lần truy vấn
        // ⇒ không N+1 (mỗi tour cần 1 ngày ⇒ không cần danh sách đầy đủ).
        List<Tour> legacyTours = tours.stream()
                .filter(t -> !t.isWizardTour() && !result.containsKey(t.getTourId()))
                .toList();
        if (!legacyTours.isEmpty()) {
            // tourId → các destinationId của tour.
            Map<Long, List<Long>> tourDestinationIds = new LinkedHashMap<>();
            for (Tour tour : legacyTours) {
                List<Long> destinationIds = tour.getTourDestinations() == null
                        ? List.of()
                        : tour.getTourDestinations().stream()
                                .map(td -> td.getDestination())
                                .filter(d -> d != null)
                                .map(d -> d.getId())
                                .toList();
                if (!destinationIds.isEmpty()) {
                    tourDestinationIds.put(tour.getTourId(), destinationIds);
                }
            }
            if (!tourDestinationIds.isEmpty()) {
                List<Long> allDestinationIds = tourDestinationIds.values().stream()
                        .flatMap(List::stream).distinct().toList();
                // destinationId → experienceIds (1 truy vấn cho mọi tour luồng cũ).
                Map<Long, List<Long>> experiencesByDestination = new LinkedHashMap<>();
                for (Experience e : experienceRepository.findByDestination_IdInOrderById(allDestinationIds)) {
                    Long destinationId = e.getDestinationId();
                    if (destinationId == null) continue;
                    experiencesByDestination
                            .computeIfAbsent(destinationId, id -> new ArrayList<>())
                            .add(e.getId());
                }
                // tourId → experienceIds của tour đó.
                Map<Long, List<Long>> tourExperienceIds = new LinkedHashMap<>();
                for (Map.Entry<Long, List<Long>> entry : tourDestinationIds.entrySet()) {
                    List<Long> expIds = entry.getValue().stream()
                            .flatMap(destId -> experiencesByDestination.getOrDefault(destId, List.of()).stream())
                            .distinct().toList();
                    if (!expIds.isEmpty()) {
                        tourExperienceIds.put(entry.getKey(), expIds);
                    }
                }
                if (!tourExperienceIds.isEmpty()) {
                    List<Long> allExperienceIds = tourExperienceIds.values().stream()
                            .flatMap(List::stream).distinct().toList();
                    // experienceId → các tourId chứa trải nghiệm đó.
                    Map<Long, List<Long>> toursByExperience = new LinkedHashMap<>();
                    for (Map.Entry<Long, List<Long>> entry : tourExperienceIds.entrySet()) {
                        for (Long experienceId : entry.getValue()) {
                            toursByExperience.computeIfAbsent(experienceId, id -> new ArrayList<>())
                                    .add(entry.getKey());
                        }
                    }
                    // Ngày → tourId → MIN(remaining) (giống logic legacyAvailability).
                    Map<LocalDate, Map<Long, Integer>> remainingByDate = new LinkedHashMap<>();
                    for (ExperienceSlot slot : experienceSlotRepository.findByExperienceIds(allExperienceIds)) {
                        if (slot.getSlotDate().isBefore(today)) {
                            continue;
                        }
                        int remaining = Math.max(0,
                                (slot.getMaxTourPerDay() == null ? 0 : slot.getMaxTourPerDay())
                                        - (slot.getBookedTourCount() == null ? 0 : slot.getBookedTourCount()));
                        for (Long tourId : toursByExperience.getOrDefault(slot.getExperience().getId(), List.of())) {
                            remainingByDate
                                    .computeIfAbsent(slot.getSlotDate(), d -> new LinkedHashMap<>())
                                    .merge(tourId, remaining, Math::min);
                        }
                    }
                    for (Map.Entry<LocalDate, Map<Long, Integer>> entry : remainingByDate.entrySet()) {
                        for (Map.Entry<Long, Integer> perTour : entry.getValue().entrySet()) {
                            if (perTour.getValue() <= 0) continue;
                            result.merge(perTour.getKey(), entry.getKey(),
                                    (a, b) -> a.isBefore(b) ? a : b);
                        }
                    }
                }
            }
        }
        return result;
    }

    /** Số ngày nhìn về phía trước khi tìm ngày khởi hành gần nhất (an toàn cho truy vấn). */
    private static final int MAX_LOOKAHEAD_DAYS = 120;
}
