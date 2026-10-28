package com.journeygo.modules.booking.repository;

import com.journeygo.modules.booking.entity.BookingSlotHold;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookingSlotHoldRepository extends JpaRepository<BookingSlotHold, Long> {

    List<BookingSlotHold> findByBooking_Id(Long bookingId);

    List<BookingSlotHold> findByBooking_IdAndReleasedFalse(Long bookingId);

    long countByBooking_IdAndReleasedFalse(Long bookingId);

    @Query("""
            SELECT h FROM BookingSlotHold h
            WHERE h.booking.id = :bookingId
            """)
    List<BookingSlotHold> findAllByBooking(@Param("bookingId") Long bookingId);
}
