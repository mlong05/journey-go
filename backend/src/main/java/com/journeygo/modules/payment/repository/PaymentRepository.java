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

import java.util.List;
import java.util.Optional;

@Repository
public interface PaymentRepository extends JpaRepository<Payment, Long> {

    Optional<Payment> findByTxnRef(String txnRef);

    List<Payment> findByBooking_IdOrderByCreatedAtDesc(Long bookingId);

    Page<Payment> findByBooking_Id(Long bookingId, Pageable pageable);

    Page<Payment> findByBooking_Tourist_Id(Long touristId, Pageable pageable);

    List<Payment> findByStatus(PaymentStatus status);

    long countByBooking_IdAndStatus(Long bookingId, PaymentStatus status);

    boolean existsByBooking_IdAndStatus(Long bookingId, PaymentStatus status);

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
