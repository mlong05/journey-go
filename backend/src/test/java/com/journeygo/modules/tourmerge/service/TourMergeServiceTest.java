package com.journeygo.modules.tourmerge.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.booking.entity.BookingPassenger;
import com.journeygo.modules.booking.repository.BookingPassengerRepository;
import com.journeygo.modules.providerprofile.entity.ProviderProfile;
import com.journeygo.modules.providerprofile.repository.ProviderProfileRepository;
import com.journeygo.modules.tour.entity.GuestType;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.TourSlot;
import com.journeygo.modules.tour.entity.TourSlotStatus;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import com.journeygo.modules.tour.repository.TourSlotRepository;
import com.journeygo.modules.tourmerge.dto.request.CancelTourMergeRequest;
import com.journeygo.modules.tourmerge.dto.request.ConfirmTourMergeRequest;
import com.journeygo.modules.tourmerge.dto.request.CreateTourMergeRequest;
import com.journeygo.modules.tourmerge.dto.request.ReviewTourMergeRequest;
import com.journeygo.modules.tourmerge.entity.TourMerge;
import com.journeygo.modules.tourmerge.entity.enums.TourMergeStatus;
import com.journeygo.modules.tourmerge.repository.TourMergeRepository;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InOrder;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class TourMergeServiceTest {

    @Mock private TourMergeRepository tourMergeRepository;
    @Mock private TourSlotRepository tourSlotRepository;
    @Mock private TourMergeValidationService validationService;
    @Mock private BookingPassengerRepository bookingPassengerRepository;
    @Mock private ProviderProfileRepository providerProfileRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks
    private TourMergeService service;

    private final LocalDate date = LocalDate.now().plusDays(4);

    private TourSlot slot(long slotId, long tourId, long ownerId, int booked) {
        User owner = User.builder().id(ownerId).email("p" + ownerId + "@test.com").build();
        Tour tour = Tour.builder()
                .tourId(tourId)
                .title("Tour " + tourId)
                .status(TourStatus.PUBLISHED)
                .createdBy(owner)
                .build();
        return TourSlot.builder()
                .id(slotId)
                .tour(tour)
                .slotDate(date)
                .capacity(15)
                .bookedCount(booked)
                .status(TourSlotStatus.OPEN)
                .build();
    }

    @Test
    void stateMachine_createConfirmApproveCancel() {
        TourSlot host = slot(20L, 100L, 1L, 5);
        TourSlot guest = slot(10L, 200L, 2L, 4);

        when(tourSlotRepository.findById(20L)).thenReturn(Optional.of(host));
        when(tourSlotRepository.findById(10L)).thenReturn(Optional.of(guest));
        when(tourMergeRepository.save(any(TourMerge.class))).thenAnswer(inv -> {
            TourMerge m = inv.getArgument(0);
            if (m.getId() == null) m.setId(99L);
            return m;
        });
        when(providerProfileRepository.findByUserIds(anyList())).thenReturn(List.of(
                ProviderProfile.builder().user(host.getTour().getCreatedBy()).providerName("Provider Host").build(),
                ProviderProfile.builder().user(guest.getTour().getCreatedBy()).providerName("Provider Guest").build()
        ));

        var created = service.createMergeRequest(new CreateTourMergeRequest(
                20L, 10L, LocalTime.of(8, 0), "Bến Ninh Kiều", 16, "Ghép chặng đầu"), 1L);
        assertEquals(TourMergeStatus.PENDING_PROVIDER, created.status());
        assertEquals(2L, created.targetProviderId());

        TourMerge pending = TourMerge.builder()
                .id(99L)
                .hostSlot(host)
                .guestSlot(guest)
                .initiatorProvider(host.getTour().getCreatedBy())
                .targetProvider(guest.getTour().getCreatedBy())
                .departureDate(date)
                .mergedDepartureTime(LocalTime.of(8, 0))
                .mergedMeetingPoint("Bến Ninh Kiều")
                .mergedCapacity(16)
                .status(TourMergeStatus.PENDING_PROVIDER)
                .build();

        when(tourMergeRepository.findByIdForUpdate(99L)).thenReturn(Optional.of(pending));
        var confirmed = service.confirmOrReject(99L, new ConfirmTourMergeRequest(true, null), 2L);
        assertEquals(TourMergeStatus.PENDING_MOD, confirmed.status());
        assertTrue(confirmed.targetConfirmed());

        // Mod approves -> locks min(10) then max(20)
        when(userRepository.findById(900L)).thenReturn(Optional.of(User.builder().id(900L).build()));
        when(tourSlotRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(guest));
        when(tourSlotRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(host));

        var approved = service.reviewByMod(99L, new ReviewTourMergeRequest(true, null), 900L);
        assertEquals(TourMergeStatus.APPROVED, approved.status());

        InOrder inOrder = inOrder(tourSlotRepository);
        inOrder.verify(tourSlotRepository).findByIdForUpdate(10L);
        inOrder.verify(tourSlotRepository).findByIdForUpdate(20L);

        var cancelled = service.cancelMerge(99L, new CancelTourMergeRequest("Hủy ghép"), 1L, false);
        assertEquals(TourMergeStatus.CANCELLED, cancelled.status());
    }

    @Test
    void reviewByMod_throwsCapacityExceededAndDoesNotApprove() {
        TourSlot host = slot(20L, 100L, 1L, 10);
        TourSlot guest = slot(10L, 200L, 2L, 8);
        TourMerge pendingMod = TourMerge.builder()
                .id(55L)
                .hostSlot(host)
                .guestSlot(guest)
                .initiatorProvider(host.getTour().getCreatedBy())
                .targetProvider(guest.getTour().getCreatedBy())
                .mergedCapacity(15)
                .status(TourMergeStatus.PENDING_MOD)
                .build();

        when(tourMergeRepository.findByIdForUpdate(55L)).thenReturn(Optional.of(pendingMod));
        when(userRepository.findById(900L)).thenReturn(Optional.of(User.builder().id(900L).build()));
        when(tourSlotRepository.findByIdForUpdate(10L)).thenReturn(Optional.of(guest));
        when(tourSlotRepository.findByIdForUpdate(20L)).thenReturn(Optional.of(host));
        doThrow(new AppException(ErrorCode.TOUR_MERGE_CAPACITY_EXCEEDED))
                .when(validationService).validateOrThrow(host, guest, 15, 55L);

        AppException ex = assertThrows(AppException.class,
                () -> service.reviewByMod(55L, new ReviewTourMergeRequest(true, null), 900L));
        assertEquals(ErrorCode.TOUR_MERGE_CAPACITY_EXCEEDED, ex.getErrorCode());
        assertEquals(TourMergeStatus.PENDING_MOD, pendingMod.getStatus());
        verify(tourMergeRepository, never()).save(any());
    }

    @Test
    void getPassengerManifest_tagsTourAndProviderAndMasksHostEmailForGuest() {
        TourSlot host = slot(20L, 100L, 1L, 1);
        TourSlot guest = slot(10L, 200L, 2L, 1);
        TourMerge merge = TourMerge.builder()
                .id(77L)
                .hostSlot(host)
                .guestSlot(guest)
                .initiatorProvider(host.getTour().getCreatedBy())
                .targetProvider(guest.getTour().getCreatedBy())
                .departureDate(date)
                .mergedDepartureTime(LocalTime.of(8, 0))
                .mergedMeetingPoint("Bến Ninh Kiều")
                .mergedCapacity(20)
                .status(TourMergeStatus.APPROVED)
                .build();

        when(tourMergeRepository.findById(77L)).thenReturn(Optional.of(merge));

        BookingPassenger pHost = BookingPassenger.builder()
                .id(1L).fullName("Nguyễn Văn A").email("vana@gmail.com")
                .guestType(GuestType.ADULT).countsTowardSlot(true).bookingCustomer(true).build();
        BookingPassenger pGuest = BookingPassenger.builder()
                .id(2L).fullName("Trần Thị B").email("thib@gmail.com")
                .guestType(GuestType.CHILD).countsTowardSlot(true).bookingCustomer(false).build();

        when(bookingPassengerRepository.findAttendingPassengersByTourSlotIds(eq(List.of(20L, 10L)), anyList(), anyList()))
                .thenReturn(List.of(
                        new Object[]{pHost, "JGC-001", 100L, "Tour Miền Tây A", 1L, 20L},
                        new Object[]{pGuest, "JGC-002", 200L, "Tour Miền Tây B", 2L, 10L}
                ));
        when(providerProfileRepository.findByUserIds(anyList())).thenReturn(List.of(
                ProviderProfile.builder().user(host.getTour().getCreatedBy()).providerName("Công ty A").build(),
                ProviderProfile.builder().user(guest.getTour().getCreatedBy()).providerName("Công ty B").build()
        ));

        var manifestForGuest = service.getPassengerManifest(77L, 2L, false);
        assertEquals(2, manifestForGuest.totalPassengers());
        assertEquals("HOST", manifestForGuest.passengers().get(0).slotRole());
        assertEquals("Tour Miền Tây A", manifestForGuest.passengers().get(0).originalTourName());
        assertEquals("Công ty A", manifestForGuest.passengers().get(0).providerName());
        assertEquals("va***@gmail.com", manifestForGuest.passengers().get(0).email());
        assertEquals("thib@gmail.com", manifestForGuest.passengers().get(1).email());
    }
}
