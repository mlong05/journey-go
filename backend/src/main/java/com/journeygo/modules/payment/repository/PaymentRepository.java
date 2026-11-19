package com.journeygo.modules.payment.repository;

import com.journeygo.modules.payment.entity.Payment;
import com.journeygo.modules.payment.entity.enums.PaymentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByTxnRef(String txnRef);

    /**
     * Danh sách giao dịch theo trạng thái (ADMIN) — KHÔNG có từ khoá.
     *
     * <p>Tách riêng khỏi {@link #searchByKeyword} vì lý do kỹ thuật:
     * trên PostgreSQL, một tham số {@code String} null được Hibernate bind KHÔNG kèm
     * kiểu ⇒ PostgreSQL suy ra kiểu {@code bytea} cho tham số đó trong biểu thức
     * {@code CONCAT('%', :search, '%')} ⇒ sinh {@code lower(bytea)} ⇒ lỗi
     * "function lower(bytea) does not exist" ⇒ MỌI request danh sách giao dịch
     * (kể cả khi người dùng KHÔNG tìm kiếm) đều trả HTTP 500.
     *
     * <p>Tham số {@code status} là ENUM nên luôn được bind kèm kiểu ⇒ an toàn.
     */
    @Query("""
            SELECT p FROM Payment p
            WHERE (:status IS NULL OR p.status = :status)
            """)
    Page<Payment> findByStatusPage(@Param("status") PaymentStatus status, Pageable pageable);

    /**
     * Tìm giao dịch theo mã giao dịch / mã đơn / mã giao dịch VNPay — TRÊN TOÀN HỆ THỐNG.
     *
     * <p>Dùng cho ô "Tìm mã giao dịch" của trang quản trị. Việc lọc ở database (không lọc
     * sau khi phân trang) là bắt buộc: nếu lọc ở frontend trên nội dung của 1 trang thì
     * mã giao dịch nằm ở trang khác sẽ không bao giờ tìm thấy.
     *
     * <p>⚠️ Tham số {@code :search} ở đây LUÔN khác null (service đã tách 2 nhánh) —
     * xem giải thích ở {@link #findByStatusPage} về lỗi {@code lower(bytea)}.
     */
    @Query("""
            SELECT p FROM Payment p
            WHERE (:status IS NULL OR p.status = :status)
              AND (
                    LOWER(p.txnRef) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(p.booking.bookingCode) LIKE LOWER(CONCAT('%', :search, '%'))
                    OR LOWER(COALESCE(p.vnpTransactionNo, '')) LIKE LOWER(CONCAT('%', :search, '%'))
                  )
            """)
    Page<Payment> searchByKeyword(@Param("status") PaymentStatus status,
                                   @Param("search") String search,
                                   Pageable pageable);

    List<Payment> findByBooking_IdOrderByCreatedAtDesc(Long bookingId);

    Page<Payment> findByBooking_Id(Long bookingId, Pageable pageable);

    Page<Payment> findByBooking_Tourist_Id(Long touristId, Pageable pageable);

    List<Payment> findByStatus(PaymentStatus status);

    long countByBooking_IdAndStatus(Long bookingId, PaymentStatus status);

    boolean existsByBooking_IdAndStatus(Long bookingId, PaymentStatus status);

    // ── Tổng hợp toàn hệ thống (ADMIN) ───────────────────────────────────────
    // Dùng cho ô chỉ số "Tổng tiền đã thu" — KHÔNG được cộng trên 1 trang
    // (mỗi lần đổi trang sẽ ra con số khác nhau → sai lệch đối soát).

    /** Tổng số tiền của các giao dịch theo trạng thái (null khi chưa có giao dịch nào). */
    @Query("""
            SELECT COALESCE(SUM(p.amount), 0)
            FROM Payment p
            WHERE p.status = :status
            """)
    BigDecimal sumAmountByStatus(@Param("status") PaymentStatus status);

    /** Số lượng giao dịch theo trạng thái. */
    long countByStatus(PaymentStatus status);

    /**
     * Tổng số tiền VOUCHER đã giảm trên các giao dịch theo trạng thái.
     *
     * <p>Dùng cho ô "Tổng tiền giao dịch" — hiển thị GIÁ GỐC (trước khi áp voucher)
     * chứ không phải số tiền khách thực trả.
     *
     * @see com.journeygo.modules.booking.entity.Booking#getDiscountAmount()
     */
    @Query("""
            SELECT COALESCE(SUM(b.discountAmount), 0)
            FROM Payment p
            JOIN p.booking b
            WHERE p.status = :status
            """)
    BigDecimal sumVoucherDiscountByStatus(@Param("status") PaymentStatus status);

    /** Số lượng giao dịch theo nhóm trạng thái (vd: PENDING + PROCESSING). */
    @Query("SELECT COUNT(p) FROM Payment p WHERE p.status IN :statuses")
    long countByStatusIn(@Param("statuses") List<PaymentStatus> statuses);

    /**
     * Lấy Payment kèm khóa pessimistic write — dùng khi xử lý IPN/Return để tránh
     * xử lý trùng callback đồng thời (UC-04 — Callback trùng).
     */
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Payment p WHERE p.id = :id")
    Optional<Payment> findByIdForUpdate(@Param("id") Long id);

    /**
     * Lấy Payment theo txnRef kèm khóa pessimistic write.
     */
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM Payment p WHERE p.txnRef = :txnRef")
    Optional<Payment> findByTxnRefForUpdate(@Param("txnRef") String txnRef);

    /**
     * Các Payment thành công đã thu tiền nhưng Booking đã được thanh toán bởi giao dịch khác
     * (khoản tiền dư — UC-04). Dùng để Admin đối soát và chuyển sang quy trình hoàn tiền.
     */
    @Query("""
            SELECT p FROM Payment p
            WHERE p.booking.id = :bookingId
              AND p.status = com.journeygo.modules.payment.entity.enums.PaymentStatus.SUCCESS
              AND p.duplicatePayment = false
            """)
    List<Payment> findSuccessfulPaymentsOfBooking(@Param("bookingId") Long bookingId);

    /**
     * Các Payment còn "kẹt" (PENDING / PROCESSING) — chưa có kết quả cuối cùng.
     *
     * <p>Dùng cho tác vụ nền đối soát lại với VNPay (UC-03, UC-05): giao dịch mà
     * khách ĐÃ thanh toán thành công nhưng callback/IPN bị mất (tunnel chết, app bị
     * kill…) sẽ bị kẹt ở PROCESSING vô thời hạn nếu không có tác vụ quét lại.
     *
     * <p>Sắp xếp theo thời điểm tạo tăng dần ⇒ quét giao dịch cũ trước.
     */
    @Query("""
            SELECT p FROM Payment p
            WHERE p.status IN :statuses
            ORDER BY p.createdAt ASC
            """)
    List<Payment> findStuckPayments(@Param("statuses") List<PaymentStatus> statuses);

    /**
     * Các Payment ĐÃ QUÁ HẠN thanh toán mà chưa có kết quả cuối cùng.
     *
     * <p>── Vì sao cần? ──
     * Giao dịch VNPay có hạn thanh toán (10 phút, cố định theo {@code paymentDeadline}
     * của Booking). Nếu khách không hoàn tất thanh toán, giao dịch treo ở
     * {@code PENDING}/{@code PROCESSING} — và vì QueryDR trên VNPay Sandbox luôn trả
     * {@code vnp_ResponseCode=99} nên tác vụ đối soát KHÔNG bao giờ đóng được chúng
     * ⇒ giao dịch treo VÔ THỜI HẠN, hiển thị "Đang xử lý" hàng tháng trên
     * trang Quản trị Tài chính.
     *
     * <p>⇒ Tác vụ quét hết hạn dùng query này để chuyển chúng sang {@code EXPIRED}.
     *
     * <p>Sắp xếp theo {@code expiresAt} tăng dần ⇒ xử lý giao dịch quá hạn lâu nhất trước.
     */
    @Query("""
            SELECT p FROM Payment p
            WHERE p.status IN :statuses
              AND p.expiresAt < :now
            ORDER BY p.expiresAt ASC
            """)
    List<Payment> findExpiredPendingPayments(@Param("statuses") List<PaymentStatus> statuses,
                                             @Param("now") Instant now);

    /**
     * Các Payment còn "kẹt" thuộc về Booking ĐÃ được thanh toán bởi giao dịch khác.
     *
     * <p>Dùng cho danh sách giao dịch (của tôi / của một booking / toàn hệ thống)
     * để đóng dứt khoát các giao dịch bị bỏ rơi — tránh hiển thị "đang chờ kết quả
     * thanh toán" cho đơn vốn đã được thanh toán.
     *
     * <p>Điều kiện: Booking ở {@code CONFIRMED}/{@code COMPLETED} VÀ có ít nhất một
     * giao dịch {@code SUCCESS} khác (giao dịch đã thực sự thu tiền).
     *
     * @param bookingIds các booking cần quét (rỗng ⇒ không quét gì)
     */
    @Query("""
            SELECT p FROM Payment p
            WHERE p.status IN :statuses
              AND p.booking.id IN :bookingIds
              AND p.booking.status IN (
                    com.journeygo.modules.booking.entity.enums.BookingStatus.CONFIRMED,
                    com.journeygo.modules.booking.entity.enums.BookingStatus.COMPLETED
              )
              AND EXISTS (
                    SELECT 1 FROM Payment ok
                    WHERE ok.booking.id = p.booking.id
                      AND ok.id <> p.id
                      AND ok.status = com.journeygo.modules.payment.entity.enums.PaymentStatus.SUCCESS
              )
            """)
    List<Payment> findStrandedPaymentsOfPaidBookings(@Param("bookingIds") List<Long> bookingIds,
                                                      @Param("statuses") List<PaymentStatus> statuses);
}
