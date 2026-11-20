package com.journeygo.modules.booking.repository;

import com.journeygo.modules.booking.entity.BookingPassenger;
import com.journeygo.modules.booking.entity.enums.BookingPassengerStatus;
import com.journeygo.modules.refund.entity.enums.RefundStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
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

    /**
     * Thống kê hành khách ĐANG HOẠT ĐỘNG theo (tour, ngày, trạng thái booking, loại khách)
     * cho các tour của một đối tác — dùng cho màn "Theo lịch khởi hành".
     *
     * <p>Mỗi dòng: {@code [tourId, experienceDate, bookingStatus, guestType, guestCount, seatCount]}.
     *
     * <p>⚠️ Hành khách của đơn đã được Admin duyệt hoàn tiền bị LOẠI — khách đã
     * hoàn tiền thì không còn tham gia chuyến đi.
     */
    @Query("""
            SELECT b.tour.tourId, b.experienceDate, b.status, p.guestType,
                   COUNT(p), SUM(CASE WHEN p.countsTowardSlot = true THEN 1 ELSE 0 END)
            FROM BookingPassenger p JOIN p.booking b
            WHERE b.tour.createdBy.id = :providerId
              AND b.experienceDate BETWEEN :from AND :to
              AND p.status = com.journeygo.modules.booking.entity.enums.BookingPassengerStatus.ACTIVE
              AND NOT EXISTS (
                  SELECT rr.id FROM RefundRequest rr
                  WHERE rr.payment.booking.id = b.id
                    AND rr.status IN :refundStatuses
              )
            GROUP BY b.tour.tourId, b.experienceDate, b.status, p.guestType
            """)
    List<Object[]> aggregateProviderPassengers(@Param("providerId") Long providerId,
                                               @Param("from") LocalDate from,
                                               @Param("to") LocalDate to,
                                               @Param("refundStatuses") List<RefundStatus> refundStatuses);
}
