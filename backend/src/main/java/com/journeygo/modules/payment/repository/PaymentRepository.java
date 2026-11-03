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
}
