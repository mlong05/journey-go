package com.journeygo.modules.tour.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourDepartureDate;
import com.journeygo.modules.tour.entity.TourSlot;
import com.journeygo.modules.tour.entity.TourSlotStatus;
import com.journeygo.modules.tour.repository.TourSlotRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Đồng bộ {@link TourSlot} với lịch khởi hành của tour.
 * Chỉ tour đã duyệt (PUBLISHED / PAUSED) mới có slot.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class TourSlotService {

    private final TourSlotRepository slotRepository;

    /**
     * Mở slot cho mọi ngày khởi hành ở tương lai, đóng slot của ngày đã bỏ khỏi lịch.
     * Ngày đã có booking thì không được đóng (BR-06). Sức chứa slot chưa có booking được cập nhật
     * theo "Số chỗ tối đa mỗi slot" mới; slot đã có booking giữ nguyên (BR-05).
     */
    @Transactional
    public void syncSlots(Tour tour) {
        LocalDate today = LocalDate.now(TourSubmissionValidator.ZONE);
        int capacity = tour.getMaxGuestsPerSlot() == null ? 0 : tour.getMaxGuestsPerSlot();
        Set<LocalDate> wanted = tour.getDepartureDates().stream()
                .map(TourDepartureDate::getDepartureDate)
                .filter(date -> date.isAfter(today))
                .collect(Collectors.toSet());
        Map<LocalDate, TourSlot> existing = slotRepository.findByTour_TourIdOrderBySlotDateAsc(tour.getTourId())
                .stream().collect(Collectors.toMap(TourSlot::getSlotDate, Function.identity()));

        for (TourSlot slot : existing.values()) {
            if (slot.getSlotDate().isAfter(today) && !wanted.contains(slot.getSlotDate())
                    && slot.getStatus() == TourSlotStatus.OPEN) {
                if (slot.hasBookings()) {
                    throw new AppException(ErrorCode.TOUR_SLOT_HAS_BOOKINGS,
                            "Ngày " + slot.getSlotDate() + " đã có booking, không thể đóng. "
                                    + "Muốn hủy phải theo chính sách hủy và hoàn tiền cho khách");
                }
                slot.setStatus(TourSlotStatus.CLOSED);
            }
        }
        int created = 0;
        for (LocalDate date : wanted) {
            TourSlot slot = existing.get(date);
            if (slot == null) {
                slotRepository.save(TourSlot.builder().tour(tour).slotDate(date).capacity(capacity)
                        .status(TourSlotStatus.OPEN).build());
                created++;
            } else {
                slot.setStatus(TourSlotStatus.OPEN);
                if (!slot.hasBookings()) slot.setCapacity(capacity);
            }
        }
        slotRepository.saveAll(existing.values());
        log.info("[TourSlot] tour={} đồng bộ slot: tạo mới {}, tổng mở {}", tour.getTourId(), created, wanted.size());
    }

    /** Ngày khởi hành đã có booking — dùng để chặn bỏ ngày khỏi lịch. */
    @Transactional(readOnly = true)
    public Set<LocalDate> bookedDates(Long tourId) {
        return slotRepository.findByTour_TourIdOrderBySlotDateAsc(tourId).stream()
                .filter(TourSlot::hasBookings)
                .map(TourSlot::getSlotDate)
                .collect(Collectors.toSet());
    }
}
