package com.journeygo.modules.booking.repository;

import com.journeygo.modules.booking.entity.BookingPassenger;
import com.journeygo.modules.booking.entity.enums.BookingPassengerStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface BookingPassengerRepository extends JpaRepository<BookingPassenger, Long> {

    List<BookingPassenger> findByBooking_IdOrderByCreatedAtAsc(Long bookingId);

    List<BookingPassenger> findByBooking_IdAndStatusOrderByCreatedAtAsc(Long bookingId,
                                                                       BookingPassengerStatus status);

    Optional<BookingPassenger> findByIdAndBooking_Id(Long id, Long bookingId);

    /** Hành khách đã liên kết với một User cụ thể (dùng để kiểm tra quyền truy cập). */
    List<BookingPassenger> findByLinkedUserIdAndStatus(Long linkedUserId, BookingPassengerStatus status);

    /** Tất cả hành khách đang hoạt động của một User (dùng để tính quyền xem tour). */
    List<BookingPassenger> findByLinkedUserIdAndBooking_StatusIn(Long linkedUserId,
                                                                List<com.journeygo.modules.booking.entity.enums.BookingStatus> statuses);
}
