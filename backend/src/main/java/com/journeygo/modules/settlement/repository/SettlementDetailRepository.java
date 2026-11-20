package com.journeygo.modules.settlement.repository;

import com.journeygo.modules.settlement.entity.SettlementDetail;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
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
            JOIN FETCH d.providerRevenue r
            WHERE d.settlement.id = :settlementId
            """)
    List<SettlementDetail> findBySettlementIdWithRevenue(@Param("settlementId") Long settlementId);

    /**
     * Các khoản của RIÊNG một đối tác trong một đợt tất toán.
     *
     * <p>Dùng cho màn "Tài chính & Doanh thu" của đối tác: trong đợt tất toán TỔNG (BATCH)
     * có thể chứa dữ liệu của nhiều đối tác ⇒ phải lọc theo {@code provider_profile_id}.
     */
    @Query("""
            SELECT d FROM SettlementDetail d
            JOIN FETCH d.providerRevenue r
            JOIN FETCH r.booking b
            JOIN FETCH b.tour t
            WHERE d.settlement.id = :settlementId
              AND d.providerProfile.id = :providerProfileId
            ORDER BY b.experienceDate ASC, b.bookingCode ASC
            """)
    List<SettlementDetail> findBySettlementAndProviderProfile(
            @Param("settlementId") Long settlementId,
            @Param("providerProfileId") Long providerProfileId);

    /**
     * Các khoản của một đối tác trong MỘT đợt tất toán — dùng để tính tổng theo đối tác.
     */
    @Query("""
            SELECT d FROM SettlementDetail d
            WHERE d.settlement.id = :settlementId
              AND d.providerProfile.id = :providerProfileId
            """)
    List<SettlementDetail> findBySettlementIdAndProviderProfile(
            @Param("settlementId") Long settlementId,
            @Param("providerProfileId") Long providerProfileId);

    /**
     * Danh sách giao dịch tour đã được tất toán của một đối tác (mọi kỳ).
     *
     * <p>Chỉ gồm các khoản thuộc đợt tất toán đã DUYỆT — tức là khi tiền đã cộng vào
     * ví đối tác. Không có khoản "đang chờ tất toán".
     */
    @Query("""
            SELECT d FROM SettlementDetail d
            JOIN d.providerRevenue r
            JOIN r.booking b
            JOIN b.tour t
            JOIN d.settlement s
            WHERE d.providerProfile.id = :providerProfileId
              AND s.status = com.journeygo.modules.settlement.entity.enums.SettlementStatus.APPROVED
            ORDER BY s.revenuePeriod DESC, b.experienceDate DESC, b.bookingCode ASC
            """)
    Page<SettlementDetail> findTransactionsByProviderProfile(
            @Param("providerProfileId") Long providerProfileId, Pageable pageable);
}
