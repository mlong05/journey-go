package com.journeygo.modules.wallet.repository;

import com.journeygo.modules.wallet.entity.WalletTransaction;
import com.journeygo.modules.wallet.entity.enums.WalletTransactionType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface WalletTransactionRepository extends JpaRepository<WalletTransaction, Long> {

    Page<WalletTransaction> findByWallet_IdOrderByCreatedAtDesc(Long walletId, Pageable pageable);

    List<WalletTransaction> findByWallet_IdOrderByCreatedAtDesc(Long walletId);

    Page<WalletTransaction> findByWallet_Partner_IdOrderByCreatedAtDesc(Long partnerId, Pageable pageable);

    /**
     * Kiểm tra đã có giao dịch cộng tiền thành công cho Settlement này chưa —
     * bảo đảm "một Settlement chỉ tạo được một giao dịch cộng tiền".
     */
    @Query("""
            SELECT t FROM WalletTransaction t
            WHERE t.wallet.id = :walletId
              AND t.sourceType = com.journeygo.modules.wallet.entity.WalletTransaction.SourceType.SETTLEMENT
              AND t.sourceId = :settlementId
              AND t.transactionType = :type
            """)
    Optional<WalletTransaction> findSettlementCredit(@Param("walletId") Long walletId,
                                                    @Param("settlementId") Long settlementId,
                                                    @Param("type") WalletTransactionType type);

    @Query("""
            SELECT COUNT(t) FROM WalletTransaction t
            WHERE t.wallet.id = :walletId
              AND t.sourceType = com.journeygo.modules.wallet.entity.WalletTransaction.SourceType.SETTLEMENT
              AND t.sourceId = :settlementId
            """)
    long countBySettlement(@Param("walletId") Long walletId, @Param("settlementId") Long settlementId);
}
