package com.journeygo.modules.booking.repository;

import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.enums.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    Optional<Booking> findByBookingCode(String bookingCode);

    List<Booking> findByTourist_IdOrderByCreatedAtDesc(Long touristId);

    Page<Booking> findByTourist_Id(Long touristId, Pageable pageable);

    List<Booking> findByTour_TourIdOrderByCreatedAtDesc(Long tourId);

    List<Booking> findByStatus(BookingStatus status);

    /**
     * Lấy Booking kèm khóa pessimistic write — dùng khi cần đảm bảo tính nguyên tử khi
     * tác vụ hết hạn chạy đồng thời với callback thanh toán (UC-01).
     */
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM Booking b WHERE b.id = :id")
    Optional<Booking> findByIdForUpdate(@Param("id") Long id);

    /**
     * Tìm các Booking đã quá hạn thanh toán và vẫn đang ở PENDING_PAYMENT — dùng cho
     * tác vụ nền quét hết hạn.
     */
    @Query("""
            SELECT b FROM Booking b
            WHERE b.status = com.journeygo.modules.booking.entity.enums.BookingStatus.PENDING_PAYMENT
              AND b.paymentDeadline <= :now
            """)
    List<Booking> findExpiredPendingBookings(@Param("now") Instant now);

    @Query("""
            SELECT b FROM Booking b
            WHERE b.status = com.journeygo.modules.booking.entity.enums.BookingStatus.PENDING_PAYMENT
              AND b.paymentDeadline <= :now
            """)
    Page<Booking> findExpiredPendingBookings(@Param("now") Instant now, Pageable pageable);

    boolean existsByTour_TourIdAndTourist_IdAndStatusIn(Long tourId, Long touristId, List<BookingStatus> statuses);
}
