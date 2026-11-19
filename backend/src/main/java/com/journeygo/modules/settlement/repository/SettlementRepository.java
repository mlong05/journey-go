package com.journeygo.modules.settlement.repository;

import com.journeygo.modules.settlement.entity.Settlement;
import com.journeygo.modules.settlement.entity.enums.SettlementScope;
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

    Page<Settlement> findByProviderProfile_IdOrderByCreatedAtDesc(Long providerProfileId, Pageable pageable);

    Page<Settlement> findByStatus(SettlementStatus status, Pageable pageable);

    /**
     * Đếm số đợt theo trạng thái — TOÀN HỆ THỐNG (không phụ thuộc phân trang).
     */
    long countByStatus(SettlementStatus status);

    /**
     * Tổng tiền của các đợt theo trạng thái — dùng cho ô "Tiền chờ chi trả".
     */
    @Query("SELECT COALESCE(SUM(s.settlementAmount), 0) FROM Settlement s WHERE s.status = :status")
    java.math.BigDecimal sumSettlementAmountByStatus(@Param("status") SettlementStatus status);

    List<Settlement> findByProviderProfile_IdAndRevenuePeriod(Long providerProfileId, String revenuePeriod);

    Optional<Settlement> findByProviderProfile_IdAndRevenuePeriodAndStatus(Long providerProfileId, String revenuePeriod,
                                                                 SettlementStatus status);

    boolean existsByProviderProfile_IdAndRevenuePeriod(Long providerProfileId, String revenuePeriod);

    /**
     * Lấy Settlement kèm khóa pessimistic write — dùng khi duyệt để tránh hai Admin
     * duyệt hai lần (chỉ tạo một giao dịch cộng tiền).
     */
    @Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT s FROM Settlement s WHERE s.id = :id")
    Optional<Settlement> findByIdForUpdate(@Param("id") Long id);

    @Query("""
            SELECT s FROM Settlement s
            WHERE s.providerProfile.id = :providerProfileId
              AND s.revenuePeriod = :period
            """)
    List<Settlement> findByProviderProfileAndPeriod(@Param("providerProfileId") Long providerProfileId, @Param("period") String period);

    /**
     * Đợt tất toán TỔNG của một kỳ (scope = BATCH) — nhiều nhất có 1 bản ghi.
     *
     * <p>Ràng buộc "mỗi kỳ chỉ 1 đợt tổng" được đảm bảo ở tầng DB bằng unique index
     * `uk_settlement_batch_period` (xem migration V41).
     */
    Optional<Settlement> findFirstByScopeAndRevenuePeriod(SettlementScope scope, String revenuePeriod);

    /**
     * Tất cả đợt tất toán TỔNG của một kỳ — dùng khi cần xem lịch sử (đợt đã bị từ chối
     * vẫn giữ để tra cứu).
     */
    List<Settlement> findByScopeAndRevenuePeriod(SettlementScope scope, String revenuePeriod);

    /**
     * Tổng hợp số tiền theo kỳ doanh thu cho các đợt đã duyệt.
     *
     * <p>Gom theo {@code revenuePeriod} để dựng bảng "Doanh thu nền tảng" theo tháng.
     * Chỉ lấy {@code APPROVED} — đó là lúc tiền thực sự được ghi vào ví đối tác.
     */
    @Query("""
            SELECT s.revenuePeriod AS revenuePeriod,
                   SUM(s.grossAmount) AS grossAmount,
                   SUM(s.refundAmount) AS refundAmount,
                   SUM(s.commissionAmount) AS commissionAmount,
                   SUM(s.adjustmentAmount) AS adjustmentAmount,
                   SUM(s.settlementAmount) AS settlementAmount,
                   COUNT(s) AS settlementCount
            FROM Settlement s
            WHERE s.status = com.journeygo.modules.settlement.entity.enums.SettlementStatus.APPROVED
            GROUP BY s.revenuePeriod
            ORDER BY s.revenuePeriod DESC
            """)
    List<ApprovedSettlementAggregate> aggregateApprovedByPeriod();
}
