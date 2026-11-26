package com.journeygo.modules.tourmerge.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.booking.dto.request.CreateBookingRequest;
import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.BookingPassenger;
import com.journeygo.modules.booking.entity.BookingSlotHold;
import com.journeygo.modules.booking.repository.BookingPassengerRepository;
import com.journeygo.modules.booking.repository.BookingRepository;
import com.journeygo.modules.booking.repository.BookingSlotHoldRepository;
import com.journeygo.modules.booking.service.BookingService;
import com.journeygo.modules.booking.service.TourBookingCatalogService;
import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourDepartureDate;
import com.journeygo.modules.tour.entity.TourFormat;
import com.journeygo.modules.tour.entity.TourPrice;
import com.journeygo.modules.tour.entity.TourSlot;
import com.journeygo.modules.tour.entity.TourSlotStatus;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import com.journeygo.modules.tour.repository.TourRepository;
import com.journeygo.modules.tour.repository.TourSlotRepository;
import com.journeygo.modules.tourmerge.entity.TourMerge;
import com.journeygo.modules.tourmerge.entity.enums.TourMergeStatus;
import com.journeygo.modules.tourmerge.repository.TourMergeRepository;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceTourMergeTest {

    @Mock private BookingRepository bookingRepository;
    @Mock private BookingSlotHoldRepository slotHoldRepository;
    @Mock private BookingPassengerRepository passengerRepository;
    @Mock private TourRepository tourRepository;
    @Mock private TourSlotRepository tourSlotRepository;
    @Mock private UserRepository userRepository;
    @Mock private TourBookingCatalogService catalogService;
    @Mock private TourMergeRepository tourMergeRepository;

    @InjectMocks
    private BookingService bookingService;

    private final LocalDate date = LocalDate.now().plusDays(5);

    private void stubCommonBookingSetup(Tour tour, User tourist, int adultCount) {
        when(userRepository.findById(tourist.getId())).thenReturn(Optional.of(tourist));
        when(tourRepository.findByTourId(tour.getTourId())).thenReturn(Optional.of(tour));
        when(catalogService.findDepartureDate(tour, date)).thenReturn(Optional.of(date));
        when(bookingRepository.existsActiveConfirmedBooking(eq(tour.getTourId()), eq(tourist.getId()), any())).thenReturn(false);
        when(bookingRepository.findActivePendingByTouristAndTour(eq(tourist.getId()), eq(tour.getTourId()), any()))
                .thenReturn(List.of());

        TourBookingCatalogService.PriceTable priceTable = new TourBookingCatalogService.PriceTable(Map.of(
                GuestType.ADULT, TourPrice.builder()
                        .guestType(GuestType.ADULT)
                        .price(new BigDecimal("500000"))
                        .countsTowardSlot(true)
                        .build()
        ));
        when(catalogService.priceTable(tour)).thenReturn(priceTable);
    }

    private CreateBookingRequest requestWithAdults(long tourId, int count) {
        List<CreateBookingRequest.PassengerRequest> passengers = new java.util.ArrayList<>();
        for (int i = 0; i < count; i++) {
            passengers.add(new CreateBookingRequest.PassengerRequest(
                    "Khách " + i,
                    LocalDate.of(1992, 1, 1),
                    "MALE",
                    "guest" + i + "@test.com",
                    GuestType.ADULT
            ));
        }
        return new CreateBookingRequest(tourId, date, passengers, null, null);
    }

    @Test
    void createBooking_blockedWhenMergedCapacityExceeded() {
        User tourist = User.builder().id(100L).email("t@test.com").build();
        Tour tour = Tour.builder()
                .tourId(10L)
                .title("Tour A")
                .tourFormat(TourFormat.DAY_TRIP)
                .status(TourStatus.PUBLISHED)
                .approved(true)
                .departureDates(List.of(TourDepartureDate.builder().departureDate(date).build()))
                .build();

        stubCommonBookingSetup(tour, tourist, 3);

        TourSlot hostSlot = TourSlot.builder()
                .id(1L).tour(tour).slotDate(date).capacity(20).bookedCount(10).status(TourSlotStatus.OPEN).build();
        TourSlot guestSlot = TourSlot.builder()
                .id(2L).slotDate(date).capacity(20).bookedCount(8).status(TourSlotStatus.OPEN).build();

        TourMerge approvedMerge = TourMerge.builder()
                .id(50L).hostSlot(hostSlot).guestSlot(guestSlot).mergedCapacity(20).status(TourMergeStatus.APPROVED).build();

        when(tourSlotRepository.findByTour_TourIdAndSlotDate(10L, date)).thenReturn(Optional.of(hostSlot));
        when(tourMergeRepository.findApprovedBySlotIdForUpdate(1L)).thenReturn(Optional.of(approvedMerge));
        when(tourSlotRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(hostSlot));
        when(tourSlotRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(guestSlot));

        // 10 + 8 + 3 = 21 > 20 -> must throw BOOKING_SLOT_FULL
        AppException ex = assertThrows(AppException.class,
                () -> bookingService.createBooking(requestWithAdults(10L, 3), 100L));

        assertEquals(ErrorCode.BOOKING_SLOT_FULL, ex.getErrorCode());
        verify(bookingRepository, never()).save(any());
        verify(tourSlotRepository, never()).atomicReserveSlots(anyLong(), anyInt());
    }

    @Test
    void createBooking_succeedsWithinMergedCapacityAndKeepsOriginalTour() {
        User tourist = User.builder().id(100L).email("t@test.com").build();
        Tour tour = Tour.builder()
                .tourId(10L)
                .title("Tour Gốc Của Khách")
                .tourFormat(TourFormat.DAY_TRIP)
                .status(TourStatus.PUBLISHED)
                .approved(true)
                .departureDates(List.of(TourDepartureDate.builder().departureDate(date).build()))
                .build();

        stubCommonBookingSetup(tour, tourist, 2);

        TourSlot hostSlot = TourSlot.builder()
                .id(1L).tour(tour).slotDate(date).capacity(20).bookedCount(10).status(TourSlotStatus.OPEN).build();
        TourSlot guestSlot = TourSlot.builder()
                .id(2L).slotDate(date).capacity(20).bookedCount(8).status(TourSlotStatus.OPEN).build();

        TourMerge approvedMerge = TourMerge.builder()
                .id(50L).hostSlot(hostSlot).guestSlot(guestSlot).mergedCapacity(20).status(TourMergeStatus.APPROVED).build();

        when(tourSlotRepository.findByTour_TourIdAndSlotDate(10L, date)).thenReturn(Optional.of(hostSlot));
        when(tourMergeRepository.findApprovedBySlotIdForUpdate(1L)).thenReturn(Optional.of(approvedMerge));
        when(tourSlotRepository.findByIdForUpdate(1L)).thenReturn(Optional.of(hostSlot));
        when(tourSlotRepository.findByIdForUpdate(2L)).thenReturn(Optional.of(guestSlot));
        when(tourSlotRepository.saveAndFlush(hostSlot)).thenReturn(hostSlot);
        when(bookingRepository.save(any(Booking.class))).thenAnswer(inv -> {
            Booking b = inv.getArgument(0);
            b.setId(999L);
            return b;
        });
        when(passengerRepository.save(any(BookingPassenger.class))).thenAnswer(inv -> inv.getArgument(0));
        when(slotHoldRepository.save(any(BookingSlotHold.class))).thenAnswer(inv -> inv.getArgument(0));

        // 10 + 8 + 2 = 20 <= 20 -> succeeds
        var response = bookingService.createBooking(requestWithAdults(10L, 2), 100L);

        assertEquals(12, hostSlot.getBookedCount());
        assertEquals("Tour Gốc Của Khách", response.tourTitle());
        verify(tourSlotRepository).saveAndFlush(hostSlot);
    }
}
