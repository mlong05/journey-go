package com.journeygo.modules.booking.service;

import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.booking.dto.request.CreateBookingRequest;
import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.booking.repository.BookingRepository;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.entity.enums.TourStatus;
import com.journeygo.modules.tour.repository.TourRepository;
import com.journeygo.modules.user.entity.User;
import com.journeygo.modules.user.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

/** Chống giữ chỗ trùng: mỗi du khách tối đa 1 đơn chờ thanh toán còn hạn cho một tour. */
@ExtendWith(MockitoExtension.class)
class BookingServicePendingTest {

    @Mock private BookingRepository bookingRepository;
    @Mock private TourRepository tourRepository;
    @Mock private UserRepository userRepository;

    @InjectMocks private BookingService service;

    private CreateBookingRequest request() {
        return new CreateBookingRequest(9L, LocalDate.now().plusDays(3), List.of(), null, null);
    }

    private void stubTourAndUser() {
        when(userRepository.findById(14L)).thenReturn(Optional.of(User.builder().id(14L).build()));
        // Tour luồng cũ (tourFormat = null) để không phải dựng lịch khởi hành.
        when(tourRepository.findByTourId(9L)).thenReturn(Optional.of(
                Tour.builder().tourId(9L).status(TourStatus.PUBLISHED).approved(true).build()));
        when(bookingRepository.existsActiveConfirmedBooking(eq(9L), eq(14L), any(LocalDate.class))).thenReturn(false);
    }

    @Test
    @DisplayName("Còn đơn chờ thanh toán chưa hết hạn cho cùng tour ⇒ không tạo đơn thứ hai")
    void createBooking_blockedWhenActivePendingExists() {
        stubTourAndUser();
        Booking pending = Booking.builder().id(1L).bookingCode("JGC-OLD").status(BookingStatus.PENDING_PAYMENT)
                .paymentDeadline(Instant.now().plusSeconds(420)).build();
        when(bookingRepository.findActivePendingByTouristAndTour(eq(14L), eq(9L), any())).thenReturn(List.of(pending));

        AppException ex = assertThrows(AppException.class, () -> service.createBooking(request(), 14L));

        assertEquals(ErrorCode.BOOKING_PENDING_EXISTS, ex.getErrorCode());
        assertTrue(ex.getMessage().contains("JGC-OLD"));
        verify(bookingRepository, never()).save(any());
    }

    @Test
    @DisplayName("Không có đơn chờ còn hạn ⇒ qua bước kiểm tra trùng (tiếp tục các bước đặt chỗ)")
    void createBooking_passesPendingCheckWhenNoneActive() {
        stubTourAndUser();
        when(bookingRepository.findActivePendingByTouristAndTour(eq(14L), eq(9L), any())).thenReturn(List.of());

        // Các bước sau (giá, slot) không được dựng trong test này nên sẽ lỗi — miễn không phải lỗi trùng đơn.
        Exception ex = assertThrows(Exception.class, () -> service.createBooking(request(), 14L));
        assertTrue(!(ex instanceof AppException app) || app.getErrorCode() != ErrorCode.BOOKING_PENDING_EXISTS);
    }
}
