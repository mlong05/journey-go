package com.journeygo.modules.settlement.repository;

import com.journeygo.modules.settlement.entity.SettlementDetail;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface SettlementDetailRepository extends JpaRepository<SettlementDetail, Long> {

    List<SettlementDetail> findBySettlement_Id(Long settlementId);

    @Query("""
            SELECT d FROM SettlementDetail d
            JOIN FETCH d.partnerRevenue r
            WHERE d.settlement.id = :settlementId
            """)
    List<SettlementDetail> findBySettlementIdWithRevenue(@Param("settlementId") Long settlementId);
}
