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
     * Danh sách yêu cầu hoàn tiền — ưu tiên yêu cầu ĐANG CHỜ XỬ LÝ lên đầu.
     *
     * <p>⚠️ Vì sao cần? Danh sách mặc định sắp theo {@code createdAt DESC} ⇒ yêu cầu mới
     * tạo nằm trên cùng, còn yêu cầu chờ xử lý từ lâu bị đẩy xuống dưới ⇒ Admin
     * phải lật nhiều trang mới thấy việc cần làm. Đây là "hàng đợi" nên việc đang
     * chờ phải nằm trên cùng.
     *
     * <p>Trạng thái "đang chờ xử lý" = {@code PENDING_REVIEW} (chờ Admin duyệt),
     * {@code APPROVED} (đã duyệt, đang hoàn tiền), {@code VNPAY_PROCESSING} (chờ VNPay),
     * {@code MANUAL_TRANSFER_PENDING} (chờ chuyển khoản thủ công) và {@code FAILED}
     * (cần Admin xử lý lại). Các trạng thái kết thúc (REFUNDED / REJECTED / CANCELLED)
     * nằm dưới cùng.
     */
    @Query("""
            SELECT r FROM RefundRequest r
            ORDER BY CASE WHEN r.status IN (
                    com.journeygo.modules.refund.entity.enums.RefundStatus.PENDING_REVIEW,
                    com.journeygo.modules.refund.entity.enums.RefundStatus.APPROVED,
                    com.journeygo.modules.refund.entity.enums.RefundStatus.VNPAY_PROCESSING,
                    com.journeygo.modules.refund.entity.enums.RefundStatus.MANUAL_TRANSFER_PENDING,
                    com.journeygo.modules.refund.entity.enums.RefundStatus.FAILED)
                    THEN 0 ELSE 1 END,
                     r.createdAt DESC
            """)
    Page<RefundRequest> findAllPendingFirst(Pageable pageable);
    /**
     * Lọc theo trạng thái + ưu tiên yêu cầu đang chờ xử lý lên đầu.
     */
    @Query("""
            SELECT r FROM RefundRequest r
            WHERE r.status = :status
            ORDER BY CASE WHEN r.status IN (
                    com.journeygo.modules.refund.entity.enums.RefundStatus.PENDING_REVIEW,
                    com.journeygo.modules.refund.entity.enums.RefundStatus.APPROVED,
                    com.journeygo.modules.refund.entity.enums.RefundStatus.VNPAY_PROCESSING,
                    com.journeygo.modules.refund.entity.enums.RefundStatus.MANUAL_TRANSFER_PENDING,
                    com.journeygo.modules.refund.entity.enums.RefundStatus.FAILED)
                    THEN 0 ELSE 1 END,
                     r.createdAt DESC
            """)
    Page<RefundRequest> findByStatusPendingFirst(@Param("status") RefundStatus status, Pageable pageable);

    /**
     * Tìm yêu cầu hoàn tiền theo từ khoá + ưu tiên yêu cầu đang chờ xử lý lên đầu.
     */
    @Query("""
            SELECT r FROM RefundRequest r
            WHERE LOWER(r.refundCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(r.payment.txnRef) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(r.payment.booking.bookingCode) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(COALESCE(r.declaredReasonCode, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(COALESCE(r.approvedReasonCode, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
               OR LOWER(COALESCE(r.reasonDetail, '')) LIKE LOWER(CONCAT('%', :keyword, '%'))
            ORDER BY CASE WHEN r.status IN (
                    com.journeygo.modules.refund.entity.enums.RefundStatus.PENDING_REVIEW,
                    com.journeygo.modules.refund.entity.enums.RefundStatus.APPROVED,
                    com.journeygo.modules.refund.entity.enums.RefundStatus.VNPAY_PROCESSING,
                    com.journeygo.modules.refund.entity.enums.RefundStatus.MANUAL_TRANSFER_PENDING,
                    com.journeygo.modules.refund.entity.enums.RefundStatus.FAILED)
                    THEN 0 ELSE 1 END,
                     r.createdAt DESC
            """)
    Page<RefundRequest> searchByKeywordPendingFirst(@Param("keyword") String keyword, Pageable pageable);

    /**
     * Tìm yêu cầu hoàn tiền theo từ khoá + trạng thái + ưu tiên yêu cầu đang chờ xử lý.
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
            ORDER BY CASE WHEN r.status IN (
                    com.journeygo.modules.refund.entity.enums.RefundStatus.PENDING_REVIEW,
                    com.journeygo.modules.refund.entity.enums.RefundStatus.APPROVED,
                    com.journeygo.modules.refund.entity.enums.RefundStatus.VNPAY_PROCESSING,
                    com.journeygo.modules.refund.entity.enums.RefundStatus.MANUAL_TRANSFER_PENDING,
                    com.journeygo.modules.refund.entity.enums.RefundStatus.FAILED)
                    THEN 0 ELSE 1 END,
                     r.createdAt DESC
            """)
    Page<RefundRequest> searchByKeywordAndStatusPendingFirst(
            @Param("keyword") String keyword,
            @Param("status") RefundStatus status,
            Pageable pageable);

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
     * Các ID đơn (booking) của một đối tác đã có yêu cầu hoàn tiền được Admin duyệt
     * (đang xử lý hoặc đã hoàn thành) — dùng để loại các đơn này khỏi danh sách
     * "khách tham gia" của đối tác.
     */
    @Query("""
            SELECT DISTINCT r.payment.booking.id
            FROM RefundRequest r
            WHERE r.status IN :statuses
              AND r.payment.booking.tour.createdBy.id = :providerId
            """)
    List<Long> findRefundedBookingIds(@Param("providerId") Long providerId,
                                      @Param("statuses") List<RefundStatus> statuses);

    /**
     * TỔNG số tiền đã hoàn thành thành công trên TOÀN HỆ THỐNG.
     *
     * <p>Dùng cho ô chỉ số "Tổng tiền đã hoàn" ở tab Tài chính & Thanh toán —
     * số tiền thực đã trả lại cho khách (chỉ tính yêu cầu hoàn đã hoàn tất).
     */
    @Query("""
            SELECT COALESCE(SUM(r.refundedAmount), 0)
            FROM RefundRequest r
            WHERE r.status = com.journeygo.modules.refund.entity.enums.RefundStatus.REFUNDED
            """)
    java.math.BigDecimal sumTotalRefundedAmount();

    /**
     * Tổng số tiền đã hoàn theo TỪNG giao dịch — dùng cho cột "Chi tiết dòng tiền"
     * của bảng Nhật ký giao dịch toàn sàn.
     *
     * <p>Gom theo payment trong MỘT câu truy vấn (không N+1): trả về cặp
     * {@code [paymentId, tổng tiền đã hoàn]} cho các payment đã hoàn thành.
     *
     * @param paymentIds danh sách id payment của trang đang xem
     */
    @Query("""
            SELECT r.payment.id, COALESCE(SUM(r.refundedAmount), 0)
            FROM RefundRequest r
            WHERE r.status = com.journeygo.modules.refund.entity.enums.RefundStatus.REFUNDED
              AND r.payment.id IN :paymentIds
            GROUP BY r.payment.id
            """)
    List<Object[]> sumRefundedAmountByPaymentIds(@Param("paymentIds") List<Long> paymentIds);

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
