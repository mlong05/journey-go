package com.journeygo.modules.tourmerge.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourSlot;
import com.journeygo.modules.tour.entity.TourSlotStatus;
import com.journeygo.modules.tour.entity.TourStop;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import com.journeygo.modules.tourmerge.entity.enums.TourMergeStatus;
import com.journeygo.modules.tourmerge.repository.TourMergeRepository;
import com.journeygo.modules.user.entity.User;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TourMergeValidationServiceTest {

    @Mock
    private TourMergeRepository tourMergeRepository;

    @InjectMocks
    private TourMergeValidationService validationService;

    private final LocalDate futureDate = LocalDate.now().plusDays(5);

    private TourStop stop(int order, String name, double lat, double lon) {
        return TourStop.builder()
                .sequenceOrder(order)
                .name(name)
                .latitude(BigDecimal.valueOf(lat))
                .longitude(BigDecimal.valueOf(lon))
                .build();
    }

    private TourSlot slot(long slotId, long tourId, long ownerId, String departureTime,
                          int bookedCount, List<TourStop> stops) {
        Tour tour = Tour.builder()
                .tourId(tourId)
                .title("Tour " + tourId)
                .status(TourStatus.PUBLISHED)
                .deleted(false)
                .createdBy(User.builder().id(ownerId).build())
                .departureTime(departureTime)
                .stops(stops)
                .build();
        return TourSlot.builder()
                .id(slotId)
                .tour(tour)
                .slotDate(futureDate)
                .capacity(20)
                .bookedCount(bookedCount)
                .status(TourSlotStatus.OPEN)
                .build();
    }

    @Test
    void evaluate_validMerge_twoProvidersShareFirstTwoStopsDivergeAtThird() {
        TourSlot host = slot(10L, 100L, 1L, "08:00 sáng", 6, List.of(
                stop(1, "Bến Ninh Kiều", 10.0315, 105.7875),
                stop(2, "Chợ nổi Cái Răng", 10.0028, 105.7445),
                stop(3, "Cồn Sơn", 10.0800, 105.7600)
        ));
        TourSlot guest = slot(20L, 200L, 2L, "08:25 sáng", 5, List.of(
                stop(1, "Ninh Kiều Wharf", 10.0317, 105.7877),
                stop(2, "Chợ Cái Răng", 10.0030, 105.7446),
                stop(3, "Làng du lịch Mỹ Khánh", 9.9850, 105.7120)
        ));

        when(tourMergeRepository.existsActiveMergeForSlot(10L, TourMergeStatus.ACTIVE_STATUSES)).thenReturn(false);
        when(tourMergeRepository.existsActiveMergeForSlot(20L, TourMergeStatus.ACTIVE_STATUSES)).thenReturn(false);

        var result = validationService.evaluate(host, guest, 16, null);

        assertTrue(result.valid(), "Expected valid merge, got errors: " + result.errorMessages());
        assertEquals(2, result.matchedPrefixStops().size());
        assertEquals(11, result.totalBookedCount());
    }

    @Test
    void evaluate_blockedWhenPrefixOrderDoesNotMatch() {
        TourSlot host = slot(10L, 100L, 1L, "08:00", 4, List.of(
                stop(1, "Điểm A", 10.0315, 105.7875),
                stop(2, "Điểm B", 10.0028, 105.7445)
        ));
        TourSlot guest = slot(20L, 200L, 2L, "08:15", 4, List.of(
                stop(1, "Điểm B", 10.0028, 105.7445),
                stop(2, "Điểm A", 10.0315, 105.7875)
        ));

        when(tourMergeRepository.existsActiveMergeForSlot(10L, TourMergeStatus.ACTIVE_STATUSES)).thenReturn(false);
        when(tourMergeRepository.existsActiveMergeForSlot(20L, TourMergeStatus.ACTIVE_STATUSES)).thenReturn(false);

        AppException ex = assertThrows(AppException.class,
                () -> validationService.validateOrThrow(host, guest, 12, null));
        assertEquals(ErrorCode.TOUR_MERGE_PREFIX_MISMATCH, ex.getErrorCode());
    }

    @Test
    void evaluate_blockedWhenSlotAlreadyInActiveMerge_enforcesOneToOneRule() {
        TourSlot host = slot(10L, 100L, 1L, "08:00", 4, List.of(stop(1, "Điểm A", 10.0, 105.0)));
        TourSlot guest = slot(20L, 200L, 2L, "08:10", 4, List.of(stop(1, "Điểm A", 10.0, 105.0)));

        when(tourMergeRepository.existsActiveMergeForSlot(10L, TourMergeStatus.ACTIVE_STATUSES)).thenReturn(false);
        when(tourMergeRepository.existsActiveMergeForSlot(20L, TourMergeStatus.ACTIVE_STATUSES)).thenReturn(true);

        AppException ex = assertThrows(AppException.class,
                () -> validationService.validateOrThrow(host, guest, 12, null));
        assertEquals(ErrorCode.TOUR_MERGE_SLOT_ALREADY_IN_MERGE, ex.getErrorCode());
    }

    @Test
    void evaluate_blockedWhenTimeDiffExceeds30Minutes() {
        TourSlot host = slot(10L, 100L, 1L, "08:00", 4, List.of(stop(1, "Điểm A", 10.0, 105.0)));
        TourSlot guest = slot(20L, 200L, 2L, "08:45", 4, List.of(stop(1, "Điểm A", 10.0, 105.0)));

        when(tourMergeRepository.existsActiveMergeForSlot(10L, TourMergeStatus.ACTIVE_STATUSES)).thenReturn(false);
        when(tourMergeRepository.existsActiveMergeForSlot(20L, TourMergeStatus.ACTIVE_STATUSES)).thenReturn(false);

        AppException ex = assertThrows(AppException.class,
                () -> validationService.validateOrThrow(host, guest, 12, null));
        assertEquals(ErrorCode.TOUR_MERGE_TIME_DIFF_EXCEEDED, ex.getErrorCode());
    }

    @Test
    void evaluate_blockedWhenTotalBookedExceedsMergedCapacity() {
        TourSlot host = slot(10L, 100L, 1L, "08:00", 8, List.of(stop(1, "Điểm A", 10.0, 105.0)));
        TourSlot guest = slot(20L, 200L, 2L, "08:15", 7, List.of(stop(1, "Điểm A", 10.0, 105.0)));

        when(tourMergeRepository.existsActiveMergeForSlot(10L, TourMergeStatus.ACTIVE_STATUSES)).thenReturn(false);
        when(tourMergeRepository.existsActiveMergeForSlot(20L, TourMergeStatus.ACTIVE_STATUSES)).thenReturn(false);

        AppException ex = assertThrows(AppException.class,
                () -> validationService.validateOrThrow(host, guest, 12, null));
        assertEquals(ErrorCode.TOUR_MERGE_CAPACITY_EXCEEDED, ex.getErrorCode());
    }
}
