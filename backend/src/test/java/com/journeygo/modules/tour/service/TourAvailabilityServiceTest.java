package com.journeygo.modules.tour.service;

import com.journeygo.modules.experience.repository.ExperienceRepository;
import com.journeygo.modules.experience.repository.ExperienceSlotRepository;
import com.journeygo.modules.tour.dto.TourSlotAvailabilityResponse.DateAvailability;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourFormat;
import com.journeygo.modules.tour.entity.TourSlot;
import com.journeygo.modules.tour.entity.TourSlotStatus;
import com.journeygo.modules.tour.repository.TourRepository;
import com.journeygo.modules.tour.repository.TourSlotRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyList;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TourAvailabilityServiceTest {

    @Mock private TourRepository tourRepository;
    @Mock private TourSlotRepository tourSlotRepository;
    @Mock private ExperienceSlotRepository experienceSlotRepository;
    @Mock private ExperienceRepository experienceRepository;

    @InjectMocks private TourAvailabilityService service;

    private static final LocalDate FROM = LocalDate.of(2026, 11, 21);
    private static final LocalDate TO = LocalDate.of(2026, 11, 30);

    private static Tour wizardTour(long id) {
        return Tour.builder().tourId(id).title("Tour " + id).tourFormat(TourFormat.DAY_TRIP).build();
    }

    private static TourSlot slot(Tour tour, LocalDate date, int capacity, int booked, TourSlotStatus status) {
        return TourSlot.builder().tour(tour).slotDate(date).capacity(capacity).bookedCount(booked).status(status).build();
    }

    @Test
    @DisplayName("Gom slot của nhiều tour luồng 5 bước bằng MỘT truy vấn, tính số chỗ còn như màn đặt tour")
    void batchesWizardSlotsInOneQuery() {
        Tour a = wizardTour(1);
        Tour b = wizardTour(2);
        when(tourSlotRepository.findByTourIdsBetween(List.of(1L, 2L), FROM, TO)).thenReturn(List.of(
                slot(a, FROM, 20, 5, TourSlotStatus.OPEN),
                slot(a, FROM.plusDays(1), 10, 10, TourSlotStatus.OPEN),   // hết chỗ
                slot(b, FROM, 15, 0, TourSlotStatus.CLOSED)));            // slot đóng

        Map<Long, List<DateAvailability>> result = service.availabilityBetween(List.of(a, b), FROM, TO);

        verify(tourSlotRepository, times(1)).findByTourIdsBetween(anyList(), any(), any());
        verify(tourSlotRepository, never()).findByTour_TourIdOrderBySlotDateAsc(any());

        List<DateAvailability> aDates = result.get(1L);
        assertEquals(2, aDates.size());
        assertEquals(15, aDates.get(0).remaining());
        assertTrue(aDates.get(0).available());
        assertEquals(0, aDates.get(1).remaining());
        assertFalse(aDates.get(1).available(), "hết chỗ thì không đặt được");

        DateAvailability bDay = result.get(2L).get(0);
        assertEquals(15, bDay.remaining());
        assertFalse(bDay.available(), "slot đóng thì không đặt được dù còn chỗ");
    }

    @Test
    @DisplayName("Không có tour hoặc khoảng ngày ngược thì trả rỗng, không truy vấn DB")
    void emptyInputsSkipQueries() {
        assertTrue(service.availabilityBetween(List.of(), FROM, TO).isEmpty());
        assertTrue(service.availabilityBetween(List.of(wizardTour(1)), TO, FROM).isEmpty());
        verify(tourSlotRepository, never()).findByTourIdsBetween(anyList(), any(), any());
    }

    @Test
    @DisplayName("Tour luồng cũ không có điểm đến thì không có ngày nào (không lỗi)")
    void legacyTourWithoutDestinationsHasNoDates() {
        Tour legacy = Tour.builder().tourId(9L).title("Cũ").build();
        assertFalse(service.availabilityBetween(List.of(legacy), FROM, TO).containsKey(9L));
    }
}
