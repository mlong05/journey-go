package com.journeygo.modules.refund.repository;

import com.journeygo.modules.refund.entity.RefundAuditLog;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RefundAuditLogRepository extends JpaRepository<RefundAuditLog, Long> {

    List<RefundAuditLog> findByRefundRequest_IdOrderByCreatedAtAsc(Long refundRequestId);

    /**
     * Lấy các dòng nhật ký gần nhất theo hành động (mới nhất trước).
     *
     * <p>Dùng để phát hiện dòng nhật ký trùng lặp: mỗi lần tác vụ nền quét lại trạng
     * thái sẽ sinh ra các dòng {@code VNPAY_STATUS_UPDATED} giống hệt nhau (cùng
     * {@code fromStatus}/{@code toStatus}) ⇒ cần bỏ qua dòng đã có sẵn.
     *
     * @param pageable dùng {@code PageRequest.of(0, 1)} để chỉ lấy dòng mới nhất
     */
    @Query("""
            SELECT l FROM RefundAuditLog l
            WHERE l.refundRequest.id = :refundId
              AND l.action = :action
            ORDER BY l.createdAt DESC, l.id DESC
            """)
    List<RefundAuditLog> findRecentByAction(@Param("refundId") Long refundId,
                                            @Param("action") RefundAuditLog.Action action,
                                            Pageable pageable);
}
