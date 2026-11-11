package com.journeygo.modules.booking.repository;

import com.journeygo.modules.booking.entity.BookingMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BookingMessageRepository extends JpaRepository<BookingMessage, Long> {

    List<BookingMessage> findByBooking_IdOrderByCreatedAtAsc(Long bookingId);

    List<BookingMessage> findByBooking_IdOrderByCreatedAtDesc(Long bookingId);

    List<BookingMessage> findByBooking_IdAndReadAtIsNull(Long bookingId);

    long countByBooking_IdAndReadAtIsNull(Long bookingId);
}
