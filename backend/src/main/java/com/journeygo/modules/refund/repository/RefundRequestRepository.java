package com.journeygo.modules.refund.repository;

import com.journeygo.modules.refund.entity.RefundRequest;
import com.journeygo.modules.refund.entity.enums.RefundStatus;
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
public interface RefundRequestRepository extends JpaRepository<RefundRequest, Long> {

    Optional<RefundRequest> findByRefundCode(String refundCode);

    List<RefundRequest> findByPayment_IdOrderByCreatedAtDesc(Long paymentId);

    Page<RefundRequest> findByPayment_Id(Long paymentId, Pageable pageable);

    Page<RefundRequest> findByTourist_Id(Long touristId, Pageable pageable);

    Page<RefundRequest> findByStatus(RefundStatus status, Pageable pageable);

    /**
     * Tìm yêu cầu hoàn tiền theo từ khoá (mã yêu cầu / mã đơn / mã giao dịch /
     * mã lý do / mô tả lý do) — dùng cho ô tìm kiếm ở trang "Yêu cầu hoàn tiền".
     */
    @Query("""
            SELECT r FROM RefundRequest r
            WHERE LOWER(r.refundCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(r.payment.txnRef) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(r.payment.booking.bookingCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(COALESCE(r.declaredReasonCode, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(COALESCE(r.approvedReasonCode, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(COALESCE(r.reasonDetail, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
            """)
    Page<RefundRequest> searchByKeyword(@Param("keyword") String keyword, Pageable pageable);

    /**
     * Tìm yêu cầu hoàn tiền theo từ khoá + trạng thái.
     */
    @Query("""
            SELECT r FROM RefundRequest r
            WHERE r.status = :status
              AND (
                    LOWER(r.refundCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(r.payment.txnRef) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(r.payment.booking.bookingCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(COALESCE(r.declaredReasonCode, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(COALESCE(r.approvedReasonCode, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
                 OR LOWER(COALESCE(r.reasonDetail, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
              )
            """)
    Page<RefundRequest> searchByKeywordAndStatus(
            @Param("keyword") String keyword,
            @Param("status") RefundStatus status,
            Pageable pageable);

    List<RefundRequest> findByStatus(RefundStatus status);

    /**
     * Tìm yêu cầu Refund đang mở (đang xử lý hoặc đã hoàn tất) của một Payment.
     *
     * <p>Dùng để chặn tạo yêu cầu trùng — "Mỗi Payment chỉ được có tối đa một yêu cầu Refund
     * đang xử lý hoặc đã hoàn tất."
     */
    @Query("""
            SELECT r FROM RefundRequest r
            WHERE r.payment.id = :paymentId
              AND r.status IN :statuses
            """)
    List<RefundRequest> findOpenOrCompletedByPayment(
            @Param("paymentId") Long paymentId,
            @Param("statuses") List<RefundStatus> statuses);

    /**
     * Tổng số tiền đã hoàn thành thành công cho một Payment — dùng để chặn hoàn vượt quá
     * số tiền thanh toán (UC-06).
     */
    @Query("""
            SELECT COALESCE(SUM(r.refundedAmount), 0)
            FROM RefundRequest r
            WHERE r.payment.id = :paymentId
              AND r.status = com.journeygo.modules.refund.entity.enums.RefundStatus.REFUNDED
            """)
    java.math.BigDecimal sumRefundedAmountByPayment(@Param("paymentId") Long paymentId);

    /**
     * Tìm các Refund thuộc một Booking (qua Payment) — dùng để biết đơn đang/có
     * yêu cầu hoàn tiền mà không cần gọi từng payment.
     */
    @Query("""
            SELECT r FROM RefundRequest r
            WHERE r.payment.booking.id = :bookingId
            ORDER BY r.createdAt DESC
            """)
    List<RefundRequest> findByBooking_IdOrderByCreatedAtDesc(@Param("bookingId") Long bookingId);

    /**
     * Lấy Refund kèm khóa pessimistic write — dùng khi duyệt/từ chối/xác minh kết quả
     * để tránh xử lý đồng thời.
     */
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM RefundRequest r WHERE r.id = :id")
    Optional<RefundRequest> findByIdForUpdate(@Param("id") Long id);

    /**
     * Tìm các Refund đang chờ xác minh kết quả cuối cùng từ VNPay.
     */
    List<RefundRequest> findByStatusAndMethod(RefundStatus status, com.journeygo.modules.refund.entity.enums.RefundMethod method);

    /**
     * Đếm số yêu cầu hoàn tiền đã dùng một mã lý do chi tiết — dùng để chặn
     * xóa mã lý do đã có lịch sử (giữ dấu vết tài chính).
     */
    @Query("""
            SELECT COUNT(r) FROM RefundRequest r
            WHERE r.declaredReasonCode = :code OR r.approvedReasonCode = :code
            """)
    long countByDeclaredReasonCodeOrApprovedReasonCode(@Param("code") String code);
}
