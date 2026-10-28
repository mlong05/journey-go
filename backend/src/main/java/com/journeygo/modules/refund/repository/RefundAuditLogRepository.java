package com.journeygo.modules.refund.repository;

import com.journeygo.modules.refund.entity.RefundAuditLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface RefundAuditLogRepository extends JpaRepository<RefundAuditLog, Long> {

    List<RefundAuditLog> findByRefundRequest_IdOrderByCreatedAtAsc(Long refundRequestId);
}
