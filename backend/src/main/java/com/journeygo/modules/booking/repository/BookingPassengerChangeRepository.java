package com.journeygo.modules.booking.repository;

import com.journeygo.modules.booking.entity.BookingPassengerChange;
import com.journeygo.modules.booking.entity.enums.PassengerChangeStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookingPassengerChangeRepository extends JpaRepository<BookingPassengerChange, Long> {

    List<BookingPassengerChange> findByBooking_IdOrderByCreatedAtDesc(Long bookingId);

    List<BookingPassengerChange> findByBooking_IdAndStatusOrderByCreatedAtDesc(Long bookingId,
                                                                               PassengerChangeStatus status);
}
