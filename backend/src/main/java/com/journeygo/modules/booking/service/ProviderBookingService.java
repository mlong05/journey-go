package com.journeygo.modules.booking.service;

import com.journeygo.common.dto.PageResponse;
import com.journeygo.common.exception.AppException;
import com.journeygo.common.exception.ErrorCode;
import com.journeygo.modules.booking.dto.response.BookingResponse;
import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.BookingPassenger;
import com.journeygo.modules.booking.repository.BookingPassengerRepository;
import com.journeygo.modules.booking.repository.BookingRepository;
import com.journeygo.modules.tour.entity.Tour;
import com.journeygo.modules.tour.repository.TourRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

/**
 * Góc nhìn dành cho <b>Đối tác (Content Provider)</b> — danh sách khách đã đặt tour
 * của họ, kèm danh sách hành khách đầy đủ.
 *
 * <p>Quy tắc:
 * <ul>
 *   <li>Đối tác chỉ xem được booking của tour do chính mình tạo ({@code Tour.createdBy}).</li>
 *   <li>Đối tác không được sửa thông tin booking của khách — mọi thay đổi phải qua
 *       yêu cầu thay đổi hành khách mà người đặt gửi.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class ProviderBookingService {

    private final BookingRepository bookingRepository;
    private final BookingPassengerRepository passengerRepository;
    private final TourRepository tourRepository;

    /**
     * Danh sách booking của các tour mà đối tác sở hữu.
     */
    @Transactional(readOnly = true)
    public PageResponse<BookingResponse> listProviderBookings(Long providerId, Long tourId, Pageable pageable) {
        Page<Booking> page = (tourId != null)
                ? bookingRepository.findByTour_TourIdAndTour_CreatedBy_Id(tourId, providerId, pageable)
                : bookingRepository.findByTour_CreatedBy_Id(providerId, pageable);
        return PageResponse.from(page, BookingResponse::fromEntity);
    }

    /**
     * Chi tiết booking kèm danh sách hành khách — dành cho đối tác.
     */
    @Transactional(readOnly = true)
    public BookingResponse getProviderBooking(Long bookingId, Long providerId) {
        Booking booking = bookingRepository.findByIdWithRelations(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
        requireOwnTour(booking, providerId);
        return BookingResponse.fromEntity(booking);
    }

    /**
     * Danh sách hành khách của một booking — dành cho đối tác (quyền xem "toàn bộ khách hàng
     * đã đặt tour" và "danh sách hành khách").
     */
    @Transactional(readOnly = true)
    public List<BookingPassenger> listPassengers(Long bookingId, Long providerId) {
        Booking booking = bookingRepository.findByIdWithRelations(bookingId)
                .orElseThrow(() -> new AppException(ErrorCode.BOOKING_NOT_FOUND));
        requireOwnTour(booking, providerId);
        return passengerRepository.findByBooking_IdOrderByCreatedAtAsc(bookingId);
    }

    /**
     * Kiểm tra đối tác có sở hữu tour của booking hay không.
     */
    public void requireOwnTour(Booking booking, Long providerId) {
        Tour tour = booking.getTour();
        Long ownerId = tour != null && tour.getCreatedBy() != null ? tour.getCreatedBy().getId() : null;
        if (ownerId == null || !ownerId.equals(providerId)) {
            throw new AppException(ErrorCode.UNAUTHORIZED,
                    "Bạn chỉ có thể xem booking của tour do mình tạo");
        }
    }

    /**
     * Đối tác có sở hữu tour này không.
     */
    public boolean ownsTour(Long tourId, Long providerId) {
        return tourRepository.findByTourId(tourId)
                .map(t -> t.getCreatedBy() != null && providerId.equals(t.getCreatedBy().getId()))
                .orElse(false);
    }
}
