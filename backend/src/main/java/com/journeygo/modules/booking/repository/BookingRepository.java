package com.journeygo.modules.booking.repository;

import com.journeygo.modules.booking.entity.Booking;
import com.journeygo.modules.booking.entity.enums.BookingStatus;
import com.journeygo.modules.refund.entity.enums.RefundStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.Instant;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface BookingRepository extends JpaRepository<Booking, Long>, JpaSpecificationExecutor<Booking> {

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

    /**
     * Thống kê đơn theo (tour, ngày, trạng thái) cho các tour của một đối tác.
     *
     * <p>Mỗi dòng: {@code [tourId, experienceDate, status, bookingCount, totalAmount]}.
     *
     * <p>⚠️ Đơn đã được Admin duyệt hoàn tiền bị LOẠI — khách đã hoàn tiền thì không
     * còn tham gia chuyến đi, nên đối tác không được thấy họ trong danh sách khách.
     * Việc chỉ tính đơn đã THANH TOÁN được thực hiện ở tầng service.
     */
    @Query("""
            SELECT b.tour.tourId, b.experienceDate, b.status, COUNT(b), COALESCE(SUM(b.totalAmount), 0)
            FROM Booking b
            WHERE b.tour.createdBy.id = :providerId
              AND b.experienceDate BETWEEN :from AND :to
              AND NOT EXISTS (
                  SELECT rr.id FROM RefundRequest rr
                  WHERE rr.payment.booking.id = b.id
                    AND rr.status IN :refundStatuses
              )
            GROUP BY b.tour.tourId, b.experienceDate, b.status
            """)
    List<Object[]> aggregateProviderBookings(@Param("providerId") Long providerId,
                                             @Param("from") LocalDate from,
                                             @Param("to") LocalDate to,
                                             @Param("refundStatuses") List<RefundStatus> refundStatuses);

    /**
     * Tổng số chỗ đang bị GIỮ bởi các đơn đã được Admin duyệt hoàn tiền.
     *
     * <p>Đơn bị hoàn tiền vẫn giữ chỗ trên slot (chưa có luồng giải phóng) ⇒ số chỗ
     * chiếm thực tế của chuyến đi = {@code slot.booked_count} − số chỗ của các đơn này.
     *
     * <p>Mỗi dòng: {@code [tourId, experienceDate, refundedSlots]}.
     */
    @Query("""
            SELECT b.tour.tourId, b.experienceDate, COALESCE(SUM(b.slotCount), 0)
            FROM Booking b
            WHERE b.tour.createdBy.id = :providerId
              AND b.experienceDate BETWEEN :from AND :to
              AND EXISTS (
                  SELECT rr.id FROM RefundRequest rr
                  WHERE rr.payment.booking.id = b.id
                    AND rr.status IN :refundStatuses
              )
            GROUP BY b.tour.tourId, b.experienceDate
            """)
    List<Object[]> aggregateProviderRefundedSlots(@Param("providerId") Long providerId,
                                                   @Param("from") LocalDate from,
                                                   @Param("to") LocalDate to,
                                                   @Param("refundStatuses") List<RefundStatus> refundStatuses);

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
     * Đơn ĐÃ THANH TOÁN mà CHƯA ĐI XONG — còn chặn đặt lại tour.
     *
     * <p>⚠️ Loại đơn có {@code experienceDate < today}: tour đã đi xong (backend chưa
     * kịp đánh dấu {@code COMPLETED}) ⇒ KHÔNG chặn đặt lại, du khách muốn thì đặt
     * tiếp tour đó cho lần sau. Khớp với {@code blocksRebook} ở frontend.
     *
     * @param tourId    ID tour
     * @param touristId ID du khách
     * @param today     ngày hôm nay (giờ Việt Nam)
     */
    @Query("""
            SELECT COUNT(b) > 0 FROM Booking b
            WHERE b.tour.tourId = :tourId
              AND b.tourist.id = :touristId
              AND b.status = com.journeygo.modules.booking.entity.enums.BookingStatus.CONFIRMED
              AND b.experienceDate >= :today
            """)
    boolean existsActiveConfirmedBooking(@Param("tourId") Long tourId,
                                        @Param("touristId") Long touristId,
                                        @Param("today") LocalDate today);

    /** Đơn của du khách đang giữ chỗ (chờ thanh toán, còn hạn), mới nhất trước. */
    @EntityGraph(attributePaths = {"tour"})
    @Query("""
            SELECT b FROM Booking b
            WHERE b.tourist.id = :touristId
              AND b.status = com.journeygo.modules.booking.entity.enums.BookingStatus.PENDING_PAYMENT
              AND b.paymentDeadline > :now
            ORDER BY b.createdAt DESC
            """)
    List<Booking> findActivePendingByTourist(@Param("touristId") Long touristId, @Param("now") Instant now);

    /** Như {@link #findActivePendingByTourist} nhưng chỉ của một tour. */
    @EntityGraph(attributePaths = {"tour"})
    @Query("""
            SELECT b FROM Booking b
            WHERE b.tourist.id = :touristId
              AND b.tour.tourId = :tourId
              AND b.status = com.journeygo.modules.booking.entity.enums.BookingStatus.PENDING_PAYMENT
              AND b.paymentDeadline > :now
            ORDER BY b.createdAt DESC
            """)
    List<Booking> findActivePendingByTouristAndTour(@Param("touristId") Long touristId, @Param("tourId") Long tourId,
                                                    @Param("now") Instant now);

    /**
     * Booking ĐÃ THANH TOÁN của du khách cho một tour (CONFIRMED / COMPLETED).
     *
     * <p>Dùng cho logic "tour đã mua rồi thì không thể đặt lại" — cần biết đơn đó
     * (để chặn tạo đơn mới VÀ để giao diện hiển thị đúng ngày/số khách đã chọn).
     */
    @EntityGraph(attributePaths = {"tourist", "tour", "tour.createdBy"})
    @Query("""
            SELECT b FROM Booking b
            WHERE b.tour.tourId = :tourId
              AND b.tourist.id = :touristId
              AND b.status IN :statuses
            ORDER BY b.experienceDate ASC, b.id ASC
            """)
    List<Booking> findPaidBookingsByTourAndTourist(@Param("tourId") Long tourId,
                                                    @Param("touristId") Long touristId,
                                                    @Param("statuses") List<BookingStatus> statuses);

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
