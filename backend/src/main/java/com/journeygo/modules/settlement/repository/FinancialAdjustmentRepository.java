package com.journeygo.modules.settlement.repository;

import com.journeygo.modules.settlement.entity.FinancialAdjustment;
import com.journeygo.modules.settlement.entity.enums.FinancialAdjustmentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FinancialAdjustmentRepository extends JpaRepository<FinancialAdjustment, Long> {

    Page<FinancialAdjustment> findByPartner_IdOrderByCreatedAtDesc(Long partnerId, Pageable pageable);

    List<FinancialAdjustment> findByPartner_IdAndStatus(Long partnerId, FinancialAdjustmentStatus status);

    Page<FinancialAdjustment> findByStatus(FinancialAdjustmentStatus status, Pageable pageable);

    boolean existsByRefundRequest_IdAndStatus(Long refundRequestId, FinancialAdjustmentStatus status);
}
