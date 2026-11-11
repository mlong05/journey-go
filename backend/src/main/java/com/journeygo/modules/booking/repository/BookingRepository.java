package com.journeygo.modules.booking.repository;

import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.enums.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long> {

    Optional<Booking> findByBookingCode(String bookingCode);

    /**
     * Nạp Booking kèm luôn {@code tourist}, {@code tour} và {@code tour.createdBy}.
     *
     * <p>⚠️ Vì sao cần EntityGraph?
     * Booking được nạp ở nhiều nơi NGOÀI giao dịch (controller gọi
     * {@code BookingService.findOrThrow}) ⇒ entity bị DETACH khỏi PersistenceContext.
     * Khi đó mọi truy cập vào proxy lười ({@code booking.getTour()}, {@code booking.getTourist()},
     * {@code tour.getCreatedBy()}) sẽ ném
     * {@code LazyInitializationException: could not initialize proxy - no Session}.
     *
     * <p>Nạp sẵn (fetch join) các liên kết này giúp mọi luồng đọc Booking — kể cả luồng
     * gửi email lời mời và gửi tin nhắn chat — không còn phụ thuộc session còn mở.
     */
    @EntityGraph(attributePaths = {"tourist", "tour", "tour.createdBy"})
    @Query("SELECT b FROM Booking b WHERE b.id = :id")
    Optional<Booking> findByIdWithRelations(@Param("id") Long id);

    List<Booking> findByTourist_IdOrderByCreatedAtDesc(Long touristId);

    Page<Booking> findByTourist_Id(Long touristId, Pageable pageable);

    /**
     * Booking mà user là HÀNH KHÁCH ĐƯỢC MỜI (đã liên kết tài khoản).
     *
     * <p>Để hành khách được mời thấy đơn trong mục "Chuyến đi" / "Đơn của tôi".
     */
    @Query("""
            SELECT DISTINCT b FROM Booking b
            JOIN b.passengers p
            WHERE p.linkedUserId = :userId
            """)
    Page<Booking> findByPassengerLinkedUserId(@Param("userId") Long userId, Pageable pageable);

    /** Booking của các tour do một đối tác tạo (góc nhìn đối tác). */
    Page<Booking> findByTour_CreatedBy_Id(Long providerId, Pageable pageable);

    /** Booking của một tour cụ thể thuộc đối tác (góc nhìn đối tác). */
    Page<Booking> findByTour_TourIdAndTour_CreatedBy_Id(Long tourId, Long providerId, Pageable pageable);

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

    /**
     * Booking đã thanh toán có ngày trải nghiệm trong khoảng cho trước — dùng cho tác vụ
     * nhắc nhở "sắp đến ngày trải nghiệm".
     */
    @Query("""
            SELECT b FROM Booking b
            WHERE b.experienceDate BETWEEN :from AND :to
              AND b.status IN :statuses
              AND b.reminderSentAt IS NULL
            """)
    List<Booking> findUpcomingForReminder(@Param("from") LocalDate from,
                                          @Param("to") LocalDate to,
                                          @Param("statuses") List<BookingStatus> statuses);
}
