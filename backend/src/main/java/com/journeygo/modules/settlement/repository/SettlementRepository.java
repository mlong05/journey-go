package com.journeygo.modules.settlement.repository;

import com.journeygo.modules.settlement.entity.Settlement;
import com.journeygo.modules.settlement.entity.enums.SettlementStatus;
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
public interface SettlementRepository extends JpaRepository<Settlement, Long> {

    Optional<Settlement> findBySettlementCode(String settlementCode);

    Page<Settlement> findByPartner_IdOrderByCreatedAtDesc(Long partnerId, Pageable pageable);

    Page<Settlement> findByStatus(SettlementStatus status, Pageable pageable);

    List<Settlement> findByPartner_IdAndRevenuePeriod(Long partnerId, String revenuePeriod);

    Optional<Settlement> findByPartner_IdAndRevenuePeriodAndStatus(Long partnerId, String revenuePeriod,
                                                                 SettlementStatus status);

    boolean existsByPartner_IdAndRevenuePeriod(Long partnerId, String revenuePeriod);

    /**
     * Lấy Settlement kèm khóa pessimistic write — dùng khi duyệt để tránh hai Admin
     * duyệt hai lần (chỉ tạo một giao dịch cộng tiền).
     */
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Settlement s WHERE s.id = :id")
    Optional<Settlement> findByIdForUpdate(@Param("id") Long id);

    @Query("""
            SELECT s FROM Settlement s
            WHERE s.partner.id = :partnerId
              AND s.revenuePeriod = :period
            """)
    List<Settlement> findByPartnerAndPeriod(@Param("partnerId") Long partnerId, @Param("period") String period);
}
